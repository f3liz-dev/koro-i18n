# frozen_string_literal: true

# Koro i18n Client Library v3
#
# CLI tool for translation management.
#
# Supports:
# - JSON, YAML file formats
# - Differential sync with platform
# - GitHub Actions OIDC authentication

require_relative "koro_i18n/version"
require_relative "koro_i18n/types"
require_relative "koro_i18n/utils"
require_relative "koro_i18n/config"
require_relative "koro_i18n/file_discovery"
require_relative "koro_i18n/manifest"
require_relative "koro_i18n/api_client"
require_relative "koro_i18n/diff"
require_relative "koro_i18n/commands"
require_relative "koro_i18n/cli"

module KoroI18n
  class Error < StandardError; end
end
