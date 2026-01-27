# frozen_string_literal: true

require "toml-rb"

module KoroI18n
  module Config
    module_function

    # Load configuration from TOML file
    def load_config(config_path = nil)
      toml_path = config_path || ".koro-i18n.repo.config.toml"

      unless File.exist?(toml_path)
        $stderr.puts "Config file not found: #{toml_path}"
        $stderr.puts "Create a .koro-i18n.repo.config.toml file or run: koro init"
        return nil
      end

      begin
        content = File.read(toml_path)
        parsed = TomlRB.parse(content)

        KoroConfig.new(
          version: 1,
          source_language: parsed.dig("source", "language"),
          target_languages: parsed.dig("target", "languages") || [],
          files: FilesConfig.new(
            include: parsed.dig("source", "include") || ["locales/{lang}/**/*.json"],
            exclude: parsed.dig("source", "exclude")
          ),
          project: ProjectConfig.new(
            name: parsed.dig("project", "name"),
            platform_url: parsed.dig("project", "platform_url")
          )
        )
      rescue TomlRB::ParseError => e
        $stderr.puts "Error parsing #{toml_path}: #{e.message}"
        nil
      end
    end

    # Create default configuration file
    DEFAULT_CONFIG = <<~TOML
      # Koro I18n Platform Configuration
      # This file configures how translation files are processed and synced

      [project]
      name = "my-project"
      platform_url = "https://koro.f3liz.workers.dev"

      # Source language (the language you write your app in)
      [source]
      language = "en"
      include = [
        "locales/{lang}/**/*.json"
      ]
      exclude = [
        "**/node_modules/**"
      ]

      # Target languages (languages you want to translate to)
      [target]
      languages = [
        "ja", "es", "fr", "de"
      ]
    TOML

    def create_default_config(path = ".koro-i18n.repo.config.toml")
      File.write(path, DEFAULT_CONFIG)
      puts "✓ Created #{path}"
    end
  end
end
