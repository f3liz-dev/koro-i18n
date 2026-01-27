# frozen_string_literal: true

module KoroI18n
  module Diff
    module_function

    # Compute diff between server and local keys
    def compute_diff(server_manifest, local_keys)
      operations = []
      local_map = {}

      # Build local map: "filename:key" -> LocalKey
      local_keys.each do |key|
        local_map["#{key.filename}:#{key.key}"] = key
      end

      # Build server set
      server_set = Set.new
      server_manifest.each do |filename, keys|
        keys.each_key do |key|
          server_set.add("#{filename}:#{key}")
        end
      end

      # Find adds and updates
      local_keys.each do |local|
        id = "#{local.filename}:#{local.key}"
        server_hash = server_manifest.dig(local.filename, local.key)

        if server_hash.nil?
          # New key
          operations << SourceKeyOperation.new(
            op: "add",
            filename: local.filename,
            key: local.key,
            value: local.value,
            hash: local.hash
          )
        elsif server_hash != local.hash
          # Updated key
          operations << SourceKeyOperation.new(
            op: "update",
            filename: local.filename,
            key: local.key,
            value: local.value,
            hash: local.hash
          )
        end
      end

      # Find deletes
      server_set.each do |server_id|
        unless local_map.key?(server_id)
          filename, key = server_id.split(":", 2)
          operations << SourceKeyOperation.new(
            op: "delete",
            filename: filename,
            key: key
          )
        end
      end

      operations
    end
  end
end
