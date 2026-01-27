# frozen_string_literal: true

require "json"
require "yaml"
require "open3"

module KoroI18n
  module Utils
    module_function

    # Simple djb2-style hash for change detection.
    #
    # This is NOT cryptographically secure and may have collisions.
    # It's used only to detect when a translation value has changed
    # between manifest generations.
    def hash_value(value)
      hash = 0
      value.each_char do |char|
        hash = ((hash << 5) - hash) + char.ord
        hash &= 0xFFFFFFFF # Convert to 32-bit integer
      end
      hash.abs.to_s(16).rjust(8, "0")
    end

    # Flatten a nested hash into dot-notation keys
    def flatten_object(obj, prefix = "")
      result = {}
      obj.each do |key, value|
        new_key = prefix.empty? ? key.to_s : "#{prefix}.#{key}"
        if value.is_a?(Hash)
          result.merge!(flatten_object(value, new_key))
        else
          result[new_key] = value.to_s
        end
      end
      result
    end

    # Unflatten dot-notation keys back to nested hash
    def unflatten_object(flat)
      result = {}
      flat.each do |key, value|
        set_nested_value(result, key, value)
      end
      result
    end

    # Set a value in a nested hash using dot-notation key
    def set_nested_value(obj, flat_key, value)
      parts = flat_key.split(".")
      current = obj

      parts[0..-2].each do |part|
        current[part] ||= {}
        current = current[part]
      end

      current[parts.last] = value
    end

    # Deep merge two hashes
    def deep_merge(target, source)
      result = target.dup

      source.each do |key, value|
        if value.is_a?(Hash) && result[key].is_a?(Hash)
          result[key] = deep_merge(result[key], value)
        else
          result[key] = value
        end
      end

      result
    end

    # Parse a translation file based on its extension
    # Supports: .json, .yaml, .yml
    def parse_translation_file(file_path, content)
      ext = File.extname(file_path).downcase

      case ext
      when ".json"
        JSON.parse(content)
      when ".yaml", ".yml"
        YAML.safe_load(content)
      else
        warn "Unsupported file format: #{ext}"
        nil
      end
    rescue JSON::ParserError, Psych::SyntaxError => e
      warn "Failed to parse #{file_path}: #{e.message}"
      nil
    end

    # Serialize content to file format based on extension
    def serialize_translation_content(file_path, content)
      ext = File.extname(file_path).downcase

      case ext
      when ".yaml", ".yml"
        YAML.dump(content)
      else
        JSON.pretty_generate(content) + "\n"
      end
    end

    # Get current git commit SHA
    def get_commit_sha
      stdout, _status = Open3.capture2("git rev-parse HEAD")
      stdout.strip
    rescue StandardError
      "local-#{Time.now.to_i}"
    end

    # Get git blame info for a file
    def get_git_blame(file_path)
      result = {}

      begin
        stdout, status = Open3.capture2("git blame --line-porcelain \"#{file_path}\"")
        return result unless status.success?

        lines = stdout.split("\n")
        current_line_number = 0
        current_author = ""
        current_date = ""

        lines.each do |line|
          if line.match?(/^[0-9a-f]{40}/)
            parts = line.split
            current_line_number = parts[2].to_i
          elsif line.start_with?("author ")
            current_author = line[7..]
          elsif line.start_with?("author-time ")
            timestamp = line[12..].to_i
            current_date = Time.at(timestamp).utc.iso8601
            result[current_line_number] = { author: current_author, date: current_date }
          end
        end
      rescue StandardError
        # Not in git repo or git blame failed
      end

      result
    end

    # Find the line number where a key is defined in JSON content
    #
    # Limitations:
    # - Does not handle JSON with comments (JSONC)
    # - May fail with string values containing braces or colons
    # - Uses simple regex matching, not a full JSON parser
    def find_key_line(content, key)
      lines = content.split("\n")
      key_parts = key.split(".")
      path_stack = []
      brace_depth = 0

      lines.each_with_index do |line, i|
        line.each_char do |char|
          if char == "{"
            brace_depth += 1
          elsif char == "}"
            brace_depth -= 1
            path_stack.pop while path_stack.length >= brace_depth && !path_stack.empty?
          end
        end

        if (match = line.strip.match(/^"([^"]+)"\s*:/))
          found_key = match[1]
          current_path = path_stack.empty? ? found_key : "#{path_stack.join('.')}.#{found_key}"
          return i + 1 if current_path == key

          after_colon = line.strip[(line.strip.index(":") + 1)..].strip
          if after_colon.start_with?("{") && !after_colon.include?("}")
            path_stack.push(found_key)
          end
        end
      end

      0
    end

    # Extract language from file path
    def extract_language_from_path(file_path, config)
      all_languages = [config.source_language] + config.target_languages

      all_languages.each do |lang|
        if file_path.include?("/#{lang}/") || file_path.include?("/#{lang}.json") ||
           file_path.include?("\\#{lang}\\") || file_path.include?("\\#{lang}.json") ||
           file_path.include?("/#{lang}.yaml") || file_path.include?("/#{lang}.yml")
          return lang
        end
      end

      nil
    end

    # Determine output path for a translation file
    def determine_output_path(filename, language, config)
      # Replace source language in path with target language
      output_path = filename.gsub(config.source_language, language)

      # If no change, append language suffix
      if output_path == filename
        ext = File.extname(filename)
        base = filename[0..-(ext.length + 1)]
        output_path = "#{base}.#{language}#{ext}"
      end

      output_path
    end
  end
end
