# frozen_string_literal: true

module KoroI18n
  module FileDiscovery
    module_function

    # Find all translation files matching the config patterns
    def find_translation_files(config)
      files = []
      all_languages = [config.source_language] + config.target_languages

      config.files.include.each do |pattern|
        all_languages.each do |lang|
          glob_pattern = pattern.gsub("{lang}", lang)
          matches = Dir.glob(glob_pattern)

          # Apply exclusions
          if config.files.exclude
            config.files.exclude.each do |exclude_pattern|
              matches.reject! { |f| File.fnmatch?(exclude_pattern, f, File::FNM_PATHNAME) }
            end
          end

          files.concat(matches)
        end
      end

      files.uniq
    end

    # Find only source language files
    def find_source_files(config)
      files = []

      config.files.include.each do |pattern|
        glob_pattern = pattern.gsub("{lang}", config.source_language)
        matches = Dir.glob(glob_pattern)

        # Apply exclusions
        if config.files.exclude
          config.files.exclude.each do |exclude_pattern|
            matches.reject! { |f| File.fnmatch?(exclude_pattern, f, File::FNM_PATHNAME) }
          end
        end

        files.concat(matches)
      end

      files.uniq
    end
  end
end
