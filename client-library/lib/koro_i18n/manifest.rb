# frozen_string_literal: true

require "json"
require "fileutils"

module KoroI18n
  module Manifest
    module_function

    # Generate manifest from translation files
    def generate_manifest(config, files)
      lines = []
      repository = ENV["GITHUB_REPOSITORY"] || "local"
      commit_sha = Utils.get_commit_sha

      # Header
      lines << ManifestHeader.new(
        type: "header",
        version: 2,
        repository: repository,
        source_language: config.source_language,
        target_languages: config.target_languages,
        generated_at: Time.now.utc.iso8601,
        commit_sha: commit_sha
      )

      # Process each file
      files.each do |file_path|
        # Extract language from path
        language = "unknown"
        all_languages = [config.source_language] + config.target_languages

        all_languages.each do |lang|
          if file_path.include?("/#{lang}/") || file_path.include?("#{lang}.json")
            language = lang
            break
          end
        end

        next if language == "unknown"

        begin
          content = File.read(file_path)
          parsed = JSON.parse(content)
          flattened = Utils.flatten_object(parsed)
          blame_map = Utils.get_git_blame(file_path)

          # File header
          lines << FileHeader.new(
            type: "file",
            path: file_path,
            language: language,
            key_count: flattened.size
          )

          # Key entries
          flattened.each do |key, value|
            line_num = Utils.find_key_line(content, key)
            blame = blame_map[line_num]

            lines << KeyEntry.new(
              type: "key",
              file: file_path,
              language: language,
              key: key,
              value: value,
              hash: Utils.hash_value(value),
              last_modified: blame&.dig(:date),
              author: blame&.dig(:author)
            )
          end
        rescue StandardError => e
          warn "Warning: Could not process #{file_path}: #{e.message}"
        end
      end

      lines
    end

    # Write manifest to file
    def write_manifest(lines)
      output_dir = ".koro-i18n"
      output_path = File.join(output_dir, "translations.jsonl")

      FileUtils.mkdir_p(output_dir)

      content = lines.map { |line| JSON.generate(line.to_h) }.join("\n") + "\n"
      File.write(output_path, content)

      key_count = lines.count { |l| l.respond_to?(:type) && l.type == "key" }
      file_count = lines.count { |l| l.respond_to?(:type) && l.type == "file" }

      puts "✓ Generated #{output_path} (#{file_count} files, #{key_count} keys)"
    end
  end
end
