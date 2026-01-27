# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "koro_i18n"
  spec.version       = "3.0.0"
  spec.authors       = ["Koro i18n Team"]
  spec.email         = ["koro@example.com"]

  spec.summary       = "Koro i18n CLI - Translation management with differential sync"
  spec.description   = "CLI tool for managing translations with the Koro i18n platform. " \
                       "Supports JSON, YAML file formats with differential sync."
  spec.homepage      = "https://github.com/f3liz-dev/koro-i18n"
  spec.license       = "MIT"

  spec.required_ruby_version = ">= 3.0.0"

  spec.files         = Dir["lib/**/*.rb", "bin/*", "*.md", "LICENSE"]
  spec.bindir        = "bin"
  spec.executables   = ["koro", "koro-i18n"]
  spec.require_paths = ["lib"]

  spec.add_dependency "toml-rb", "~> 3.0"
  spec.add_dependency "json", "~> 2.0"

  spec.metadata = {
    "homepage_uri" => spec.homepage,
    "source_code_uri" => "https://github.com/f3liz-dev/koro-i18n",
    "changelog_uri" => "https://github.com/f3liz-dev/koro-i18n/blob/main/CHANGELOG.md"
  }
end
