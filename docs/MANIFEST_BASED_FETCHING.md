# Manifest-Based File Fetching

## Overview

Instead of using glob patterns and directory traversal, koro-i18n now supports manifest-based file fetching. This approach:

- Uses a pre-generated manifest file that lists all translation files explicitly
- Avoids runtime directory traversal for better performance
- Gives clients full control over which files are included
- Allows the manifest to be versioned with the repository

## Configuration Structure

### 1. Repository Config (Root Level)

Use the existing `.koro-i18n.repo.config.toml` in the root of your repository:

```toml
[project]
name = "your-project-name"
platform_url = "https://koro.f3liz.workers.dev"

[source]
language = "en"

[target]
languages = ["ja", "es", "fr", "de", "zh"]
```

### 2. Generated Manifest (GitHub Actions)

The GitHub Action should generate `.koro-i18n/koro-i18n.repo.generated.json`:

```json
{
  "repository": "owner/repo",
  "sourceLanguage": "en",
  "configVersion": 1,
  "files": [
    {
      "filename": "common.json",
      "sourceFilename": "locales/en/common.json",
      "lastUpdated": "2024-11-24T06:00:00.000Z",
      "commitHash": "abc123def456",
      "language": "en"
    },
    {
      "filename": "auth.json",
      "sourceFilename": "locales/en/auth.json",
      "lastUpdated": "2024-11-24T06:00:00.000Z",
      "commitHash": "abc123def456",
      "language": "en"
    }
  ]
}
```

#### Manifest Fields

- **repository**: The GitHub repository in `owner/repo` format
- **sourceLanguage**: The source language code (e.g., `en`)
- **configVersion**: Version of the config format as an integer (currently `1`)
- **files**: Array of file entries with:
  - **filename**: Target filename (e.g., `common.json`)
  - **sourceFilename**: Full path to the source file in the repository (e.g., `locales/en/common.json`)
  - **lastUpdated**: ISO 8601 timestamp of when the file was last updated
  - **commitHash**: Git commit hash of the last change
  - **language**: Language code (e.g., `en`, `ja`, `es`)

## API Endpoints

### 1. Get Manifest

Fetch the generated manifest from the repository:

```bash
GET /api/projects/:projectName/files/manifest?branch=main
Authorization: ******
```

**Response:**
```json
{
  "success": true,
  "manifest": {
    "repository": "owner/repo",
    "sourceLanguage": "en",
    "configVersion": 1,
    "files": [...]
  }
}
```

### 2. Fetch Files from Manifest

Fetch translation files using the manifest:

```bash
POST /api/projects/:projectName/files/fetch-from-manifest
Authorization: ******
{
  "branch": "main"
}
```

**Response:**
```json
{
  "success": true,
  "repository": "owner/repo",
  "branch": "main",
  "commitSha": "abc123",
  "filesFound": 4,
  "manifest": { ... },
  "files": [
    {
      "lang": "en",
      "filename": "common.json",
      "contents": { "key": "value" },
      "metadata": {
        "gitBlame": { ... },
        "charRanges": { ... },
        "sourceHashes": { ... }
      },
      "sourceHash": "file-hash",
      "commitSha": "abc123"
    }
  ]
}
```

## GitHub Actions Setup

Create a GitHub Action to generate the manifest file:

```yaml
name: Generate Translation Manifest

on:
  push:
    paths:
      - 'locales/**/*.json'
      - '.koro-i18n.repo.config.toml'

jobs:
  generate-manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate manifest
        run: |
          # Create .koro-i18n directory
          mkdir -p .koro-i18n
          
          # Generate manifest (example using Node.js)
          node <<'EOF'
          const fs = require('fs');
          const path = require('path');
          const { execSync } = require('child_process');
          const toml = require('toml');
          
          const configContent = fs.readFileSync('.koro-i18n.repo.config.toml', 'utf8');
          const config = toml.parse(configContent);
          const files = [];
          
          // Find all translation files
          const localesDir = 'locales';
          const languages = [config.source.language, ...config.target.languages];
          
          for (const lang of languages) {
            const langDir = path.join(localesDir, lang);
            if (fs.existsSync(langDir)) {
              const jsonFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
              
              for (const file of jsonFiles) {
                const filePath = path.join(langDir, file);
                const stats = fs.statSync(filePath);
                
                // Get last commit for this file
                const commitHash = execSync(`git log -1 --format=%H -- "${filePath}"`, { encoding: 'utf8' }).trim();
                
                files.push({
                  filename: file,
                  sourceFilename: filePath,
                  lastUpdated: stats.mtime.toISOString(),
                  commitHash: commitHash || 'unknown',
                  language: lang
                });
              }
            }
          }
          
          const manifest = {
            repository: process.env.GITHUB_REPOSITORY,
            sourceLanguage: config.source.language,
            configVersion: 1,
            files: files
          };
          
          fs.writeFileSync('.koro-i18n/koro-i18n.repo.generated.json', JSON.stringify(manifest, null, 2));
          EOF
      
      - name: Commit manifest
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .koro-i18n/koro-i18n.repo.generated.json
          git diff --staged --quiet || git commit -m "Update translation manifest"
          git push
```

## Frontend Integration

The frontend should:

1. First fetch the manifest to get the list of available files
2. Display the files to the user
3. Fetch specific files as needed using the manifest

Example:

```typescript
// Fetch manifest
const manifestRes = await fetch('/api/projects/my-project/files/manifest?branch=main', {
  headers: { 'Authorization': `****** }
});
const { manifest } = await manifestRes.json();

// Display files from manifest
console.log('Available files:', manifest.files);

// Fetch files using manifest
const filesRes = await fetch('/api/projects/my-project/files/fetch-from-manifest', {
  method: 'POST',
  headers: {
    'Authorization': `******,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ branch: 'main' })
});
const { files } = await filesRes.json();
```

## Benefits

1. **Performance**: No directory traversal needed at runtime
2. **Control**: Client decides exactly which files to include
3. **Versioning**: Manifest is versioned with the repository
4. **Metadata**: Includes commit hashes and update timestamps
5. **Simplicity**: No glob pattern matching needed

## Using Existing TOML Config

The manifest-based approach works with your existing `.koro-i18n.repo.config.toml` file. Simply:

1. Keep your TOML config file in the repository root
2. Set up a GitHub Action to generate the manifest (see example above)
3. Use the new `/fetch-from-manifest` endpoint

The old `/fetch-from-github` endpoint with directory traversal is still available but is now considered legacy.
