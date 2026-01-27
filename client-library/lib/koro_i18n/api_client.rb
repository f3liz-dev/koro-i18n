# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

module KoroI18n
  # API Client for communicating with the Koro i18n platform
  class ApiClient
    attr_reader :base_url, :project_name

    def initialize(project_name:, base_url: nil, token: nil)
      @base_url = base_url || ENV["KORO_API_URL"] || "https://koro.f3liz.workers.dev"
      @project_name = project_name
      @token = token || get_token
    end

    # Get hash manifest for client-side diffing
    def get_hash_manifest
      uri = URI("#{@base_url}/api/projects/#{@project_name}/source-keys/hash")
      response = make_request(uri, :get)

      raise Error, "Failed to get hash manifest: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

      data = JSON.parse(response.body)
      {
        success: true,
        manifest: data["manifest"] || {},
        total_keys: data["totalKeys"] || 0
      }
    end

    # Sync source keys (push)
    def sync_source_keys(operations, commit_sha = nil)
      uri = URI("#{@base_url}/api/projects/#{@project_name}/source-keys/sync")
      body = { commitSha: commit_sha, operations: operations.map(&:to_h) }

      response = make_request(uri, :post, body)

      unless response.is_a?(Net::HTTPSuccess)
        return { success: false, error: response.body }
      end

      data = JSON.parse(response.body)
      {
        success: true,
        results: {
          added: data.dig("results", "added") || 0,
          updated: data.dig("results", "updated") || 0,
          deleted: data.dig("results", "deleted") || 0,
          errors: data.dig("results", "errors") || []
        }
      }
    end

    # Import existing translations
    def import_translations(translations, auto_approve: false)
      uri = URI("#{@base_url}/api/projects/#{@project_name}/source-keys/import-translations")
      body = {
        translations: translations.map do |t|
          {
            language: t[:language],
            filename: t[:filename],
            key: t[:key],
            value: t[:value],
            hash: t[:hash]
          }
        end,
        autoApprove: auto_approve
      }

      response = make_request(uri, :post, body)

      unless response.is_a?(Net::HTTPSuccess)
        return { success: false, error: response.body }
      end

      data = JSON.parse(response.body)
      {
        success: true,
        results: {
          imported: data.dig("results", "imported") || 0,
          skipped: data.dig("results", "skipped") || 0,
          errors: data.dig("results", "errors") || []
        }
      }
    end

    # Pull approved translations
    def pull_translations(language: nil, status: nil)
      uri = URI("#{@base_url}/api/projects/#{@project_name}/apply/export")

      params = []
      params << "language=#{language}" if language
      params << "status=#{status}" if status
      uri.query = params.join("&") unless params.empty?

      response = make_request(uri, :get)

      unless response.is_a?(Net::HTTPSuccess)
        return { success: false, translations: [], error: response.body }
      end

      data = JSON.parse(response.body)
      translations = (data["translations"] || []).map do |t|
        Translation.new(
          language: t["language"],
          filename: t["filename"],
          key: t["key"],
          value: t["value"],
          status: t["status"],
          source_hash: t["sourceHash"]
        )
      end

      { success: true, translations: translations }
    end

    private

    def get_token
      # GitHub Actions OIDC
      if ENV["ACTIONS_ID_TOKEN_REQUEST_TOKEN"] && ENV["ACTIONS_ID_TOKEN_REQUEST_URL"]
        # Token will be fetched dynamically in get_headers
        return nil
      end

      # Environment variable
      ENV["KORO_TOKEN"]
    end

    def get_headers
      headers = { "Content-Type" => "application/json" }

      # GitHub Actions OIDC
      if ENV["ACTIONS_ID_TOKEN_REQUEST_TOKEN"] && ENV["ACTIONS_ID_TOKEN_REQUEST_URL"]
        begin
          oidc_uri = URI("#{ENV['ACTIONS_ID_TOKEN_REQUEST_URL']}&audience=#{@base_url}")
          http = Net::HTTP.new(oidc_uri.host, oidc_uri.port)
          http.use_ssl = true

          request = Net::HTTP::Get.new(oidc_uri)
          request["Authorization"] = "bearer #{ENV['ACTIONS_ID_TOKEN_REQUEST_TOKEN']}"

          response = http.request(request)
          if response.is_a?(Net::HTTPSuccess)
            data = JSON.parse(response.body)
            headers["Authorization"] = "Bearer #{data['value']}"
          end
        rescue StandardError => e
          $stderr.puts "Failed to fetch OIDC token: #{e.message}"
        end
      elsif @token
        headers["Authorization"] = "Bearer #{@token}"
      end

      headers
    end

    def make_request(uri, method, body = nil)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"

      request = case method
                when :get
                  Net::HTTP::Get.new(uri)
                when :post
                  Net::HTTP::Post.new(uri)
                end

      get_headers.each { |k, v| request[k] = v }
      request.body = JSON.generate(body) if body

      http.request(request)
    end
  end
end
