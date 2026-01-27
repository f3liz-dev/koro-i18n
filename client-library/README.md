# Koro i18n Ruby Client

Ruby CLI for managing translations with the Koro i18n platform.

## Installation

```bash
gem install koro_i18n
```

Or add to your Gemfile:

```ruby
gem 'koro_i18n'
```

## Quick Start

```bash
# Initialize config
koro init

# Validate config and find translation files
koro validate

# Push source keys to platform
koro push

# Pull approved translations
koro pull
```

## Configuration

Create `.koro-i18n.repo.config.toml` in your repository root:

```toml
[project]
name = "my-project"
platform_url = "https://koro.f3liz.workers.dev"

[source]
language = "en"
include = [
  "locales/{lang}/**/*.json"
]
exclude = [
  "**/node_modules/**"
]

[target]
languages = ["ja", "es", "fr", "de"]
```

## Commands

### `init`
Create a new `.koro-i18n.repo.config.toml` file with sensible defaults.

### `validate`
Validate your config and list all translation files found.

### `push`
Sync source keys to the platform and optionally import existing translations.

### `pull`
Download approved translations from the platform and write to local files.

### `generate`
Generate the `.koro-i18n/` metadata files (legacy command).

## Supported File Formats

- **JSON** (`.json`)
- **YAML** (`.yaml`, `.yml`)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KORO_API_URL` | Platform URL | `https://koro.f3liz.workers.dev` |
| `KORO_TOKEN` | Authentication token | - |

## GitHub Actions Integration

The CLI supports GitHub Actions OIDC authentication automatically when running in GitHub Actions.

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'
    bundler-cache: true

- name: Push translations
  run: bundle exec koro push
```

## Development

```bash
# Install dependencies
bundle install

# Run tests
bundle exec rspec

# Run linter
bundle exec rubocop
```

## License

MIT
