# frozen_string_literal: true

module KoroI18n
  # Configuration structure
  KoroConfig = Struct.new(
    :version,
    :source_language,
    :target_languages,
    :files,
    :project,
    keyword_init: true
  )

  # Files configuration
  FilesConfig = Struct.new(:include, :exclude, keyword_init: true)
  
  # Project configuration
  ProjectConfig = Struct.new(:name, :platform_url, keyword_init: true)

  # Translation entry
  TranslationEntry = Struct.new(
    :key,
    :value,
    :file,
    :language,
    :hash,
    :last_modified,
    :author,
    keyword_init: true
  )

  # Manifest header
  ManifestHeader = Struct.new(
    :type,
    :version,
    :repository,
    :source_language,
    :target_languages,
    :generated_at,
    :commit_sha,
    keyword_init: true
  ) do
    def to_h
      {
        type: type,
        version: version,
        repository: repository,
        sourceLanguage: source_language,
        targetLanguages: target_languages,
        generatedAt: generated_at,
        commitSha: commit_sha
      }
    end
  end

  # File header
  FileHeader = Struct.new(
    :type,
    :path,
    :language,
    :key_count,
    keyword_init: true
  ) do
    def to_h
      {
        type: type,
        path: path,
        language: language,
        keyCount: key_count
      }
    end
  end

  # Key entry
  KeyEntry = Struct.new(
    :type,
    :file,
    :language,
    :key,
    :value,
    :hash,
    :last_modified,
    :author,
    keyword_init: true
  ) do
    def to_h
      h = {
        type: type,
        file: file,
        language: language,
        key: key,
        value: value,
        hash: hash
      }
      h[:lastModified] = last_modified if last_modified
      h[:author] = author if author
      h
    end
  end

  # Source key operation for sync
  SourceKeyOperation = Struct.new(
    :op,
    :filename,
    :key,
    :value,
    :hash,
    keyword_init: true
  ) do
    def to_h
      h = { op: op, filename: filename, key: key }
      h[:value] = value if value
      h[:hash] = hash if hash
      h
    end
  end

  # Local key for diff computation
  LocalKey = Struct.new(
    :filename,
    :key,
    :value,
    :hash,
    keyword_init: true
  )

  # Translation for import/export
  Translation = Struct.new(
    :language,
    :filename,
    :key,
    :value,
    :status,
    :source_hash,
    keyword_init: true
  )
end
