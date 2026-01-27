# frozen_string_literal: true

require "fileutils"

module KoroI18n
  module Commands
    module_function

    # Initialize a new configuration file
    def init
      config_path = ".koro-i18n.repo.config.toml"

      if File.exist?(config_path)
        puts "#{config_path} already exists"
        return
      end

      Config.create_default_config(config_path)

      puts ""
      puts "Next steps:"
      puts "1. Edit .koro-i18n.repo.config.toml to match your project"
      puts "2. Set project.name to your project name on the platform"
      puts "3. Run: koro push"
    end

    # Validate configuration and find files
    def validate
      config = Config.load_config
      unless config
        $stderr.puts "No config found. Run: koro init"
        exit 1
      end

      puts "✓ Config loaded"
      puts "  Source language: #{config.source_language}"
      puts "  Target languages: #{config.target_languages.join(', ')}"

      files = FileDiscovery.find_translation_files(config)
      if files.empty?
        $stderr.puts "\nNo translation files found. Check files.include patterns."
        exit 1
      end

      puts "\n✓ Found #{files.length} translation file(s)"
      files.each do |file|
        puts "  - #{file}"
      end
    end

    # Generate manifest (legacy)
    def generate
      config = Config.load_config
      unless config
        $stderr.puts "No config found. Run: koro init"
        exit 1
      end

      puts "📦 Generating translation manifest...\n"

      files = FileDiscovery.find_translation_files(config)
      if files.empty?
        $stderr.puts "No translation files found. Check files.include patterns."
        exit 1
      end

      manifest = Manifest.generate_manifest(config, files)
      Manifest.write_manifest(manifest)

      puts "\n✨ Done! Commit .koro-i18n/translations.jsonl to your repository."
    end

    # Push source keys to platform
    def push
      config = Config.load_config
      unless config
        $stderr.puts "No config found. Run: koro init"
        exit 1
      end

      unless config.project&.name
        $stderr.puts "Project name not specified in config. Add [project] section with name."
        exit 1
      end

      puts "🚀 Pushing source keys to platform...\n"

      # Parse local source files
      source_files = FileDiscovery.find_source_files(config)
      if source_files.empty?
        $stderr.puts "No source files found. Check files.include patterns."
        exit 1
      end

      puts "📂 Found #{source_files.length} source file(s)"

      # Parse local keys
      local_keys = []
      source_files.each do |file_path|
        begin
          content = File.read(file_path)
          parsed = Utils.parse_translation_file(file_path, content)
          next unless parsed

          flattened = Utils.flatten_object(parsed)

          # Normalize filename relative to project root
          filename = file_path.tr("\\", "/")

          flattened.each do |key, value|
            local_keys << LocalKey.new(
              filename: filename,
              key: key,
              value: value,
              hash: Utils.hash_value(value)
            )
          end
        rescue StandardError => e
          warn "Warning: Could not parse #{file_path}: #{e.message}"
        end
      end

      puts "🔑 Found #{local_keys.length} keys in source files"

      # Get server hash manifest
      client = ApiClient.new(
        project_name: config.project.name,
        base_url: config.project.platform_url
      )

      server_manifest = {}
      begin
        hash_result = client.get_hash_manifest
        server_manifest = hash_result[:manifest]
        puts "☁️  Server has #{hash_result[:total_keys]} keys"
      rescue Error
        puts "☁️  Server has no existing keys (new project)"
      end

      # Compute diff
      operations = Diff.compute_diff(server_manifest, local_keys)

      adds = operations.count { |o| o.op == "add" }
      updates = operations.count { |o| o.op == "update" }
      deletes = operations.count { |o| o.op == "delete" }

      if operations.empty?
        puts "\n✅ No changes detected. Keys are up to date."
        return
      end

      puts "\n📊 Changes: +#{adds} added, ~#{updates} updated, -#{deletes} deleted"

      # Sync to server
      commit_sha = Utils.get_commit_sha
      result = client.sync_source_keys(operations, commit_sha)

      unless result[:success]
        $stderr.puts "❌ Sync failed: #{result[:error]}"
        exit 1
      end

      puts "✅ Source keys synced successfully!"
      if result[:results][:errors]&.any?
        warn "⚠️  Some errors occurred: #{result[:results][:errors]}"
      end

      # Import existing translations (default behavior)
      translation_files = FileDiscovery.find_translation_files(config)
      non_source_files = translation_files - source_files

      if non_source_files.any?
        puts "\n📥 Importing #{non_source_files.length} translation file(s)..."

        translations = []

        non_source_files.each do |file_path|
          language = Utils.extract_language_from_path(file_path, config)
          next unless language

          begin
            content = File.read(file_path)
            parsed = JSON.parse(content)
            flattened = Utils.flatten_object(parsed)
            filename = file_path.tr("\\", "/")

            flattened.each do |key, value|
              # Find corresponding source hash
              source_key = local_keys.find { |k| k.key == key }
              translations << {
                language: language,
                filename: filename,
                key: key,
                value: value,
                hash: source_key&.hash
              }
            end
          rescue StandardError => e
            warn "Warning: Could not parse #{file_path}: #{e.message}"
          end
        end

        if translations.any?
          import_result = client.import_translations(translations, auto_approve: true)
          if import_result[:success]
            puts "✅ Imported #{import_result[:results][:imported] || 0} translations"
            if import_result[:results][:skipped]&.positive?
              puts "   (#{import_result[:results][:skipped]} skipped - already exist)"
            end
          else
            warn "⚠️  Import failed: #{import_result[:error]}"
          end
        end
      end

      puts "\n✨ Push complete!"
    end

    # Pull approved translations
    def pull
      config = Config.load_config
      unless config
        $stderr.puts "No config found. Run: koro init"
        exit 1
      end

      unless config.project&.name
        $stderr.puts "Project name not specified in config. Add [project] section with name."
        exit 1
      end

      puts "📥 Pulling approved translations...\n"

      client = ApiClient.new(
        project_name: config.project.name,
        base_url: config.project.platform_url
      )

      result = client.pull_translations(status: "approved")

      unless result[:success]
        $stderr.puts "❌ Pull failed: #{result[:error]}"
        exit 1
      end

      if result[:translations].empty?
        puts "ℹ️  No approved translations to pull."
        return
      end

      puts "📦 Received #{result[:translations].length} translations"

      # Group by filename
      file_groups = Hash.new { |h, k| h[k] = {} }
      result[:translations].each do |t|
        key = "#{t.language}:#{t.filename}"
        file_groups[key][t.key] = t.value
      end

      # Write files
      files_written = 0
      file_groups.each do |key, translations|
        language, filename = key.split(":", 2)

        # Build nested object from flat keys
        nested = Utils.unflatten_object(translations)

        # Determine output path
        output_path = Utils.determine_output_path(filename, language, config)

        # Ensure directory exists
        dir = File.dirname(output_path)
        FileUtils.mkdir_p(dir)

        # Merge with existing file if present
        final_content = nested
        if File.exist?(output_path)
          begin
            existing_content = File.read(output_path)
            existing = Utils.parse_translation_file(output_path, existing_content)
            final_content = Utils.deep_merge(existing, nested) if existing
          rescue StandardError
            # Use new content if can't parse existing
          end
        end

        File.write(output_path, Utils.serialize_translation_content(output_path, final_content))
        puts "  ✓ #{output_path}"
        files_written += 1
      end

      puts "\n✨ Pulled #{result[:translations].length} translations to #{files_written} file(s)"
    end

    # Print help message
    def help
      puts "Koro i18n CLI v#{VERSION}"
      puts ""
      puts "Commands:"
      puts "  init      Create a .koro-i18n.repo.config.toml file"
      puts "  validate  Validate config and find translation files"
      puts "  push      Sync source keys to platform (default imports translations)"
      puts "  pull      Download approved translations"
      puts "  generate  Generate translation manifest (legacy)"
      puts ""
      puts "Usage:"
      puts "  koro init"
      puts "  koro push"
      puts "  koro pull"
      puts ""
      puts "Environment:"
      puts "  KORO_API_URL   Platform URL (default: https://koro.f3liz.workers.dev)"
      puts "  KORO_TOKEN     Authentication token"
    end
  end
end
