# Implementation Summary: JSON Upload Support & GitHub Actions

## Overview
This implementation adds native JSON file upload support and exports reusable GitHub Actions for easy integration with koro-i18n as a translation platform.

## Changes Made

### 1. API Endpoints

#### Native JSON Upload (`POST /api/projects/:projectName/upload-json`)
- Direct JSON file upload without structured format processing
- Automatically flattens nested JSON structures
- Supports both string and object content
- Validates file count (max 100) and payload size (max 5MB)
- Authentication via JWT or OIDC tokens

**Request Format:**
```json
{
  "branch": "main",
  "commitSha": "abc123",
  "language": "en",
  "files": {
    "common.json": {
      "welcome": "Welcome",
      "buttons": {
        "save": "Save",
        "cancel": "Cancel"
      }
    }
  }
}
```

#### Download Translations (`GET /api/projects/:projectName/download`)
- Download all translations for a project
- Optional language filtering
- Returns files grouped by language
- Accessible via JWT or cookie authentication

**Response Format:**
```json
{
  "project": "my-project",
  "repository": "owner/repo",
  "branch": "main",
  "files": {
    "ja": {
      "common.json": {
        "buttons.save": "保存",
        "buttons.cancel": "キャンセル"
      }
    }
  },
  "generatedAt": "2024-01-01T10:00:00Z"
}
```

### 2. GitHub Actions

#### Upload Translations Action
**Location:** `.github/actions/upload-translations/`

Features:
- Two modes: `structured` (default) and `json`
- Structured mode uses client library with `.koro-i18n.repo.config.toml`
- JSON mode for simple direct uploads
- Outputs: `files-uploaded`, `upload-status`

**Usage:**
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    mode: json
```

#### Download Translations Action
**Location:** `.github/actions/download-translations/`

Features:
- Automatic flattening reversal (dot notation → nested objects)
- Optional auto-commit with customizable message
- Language filtering support
- Custom output directory

**Usage:**
```yaml
- uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
  with:
    api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
    project-name: my-project
    commit-changes: 'true'
```

### 3. Client Library Updates

Added three new functions to `client-library/src/index.ts`:

1. **`uploadJSONDirectly()`** - Upload JSON files directly
2. **`downloadFromPlatform()`** - Download translations
3. Enhanced type definitions

### 4. Documentation

#### New Documentation
- `docs/GITHUB_ACTIONS.md` - Comprehensive GitHub Actions guide
- `.github/actions/upload-translations/README.md` - Upload action docs
- `.github/actions/download-translations/README.md` - Download action docs
- `.github/workflows/i18n-sync-example.yml` - Example workflow

#### Updated Documentation
- `docs/README.md` - Added new features and GitHub Actions section

### 5. Testing

Created `src/workers.test.ts` with 6 tests:
- Upload endpoint authorization checks
- Required fields validation
- File count limits
- Download endpoint authorization
- JSON flattening logic

All tests passing ✅

### 6. Security

- CodeQL security scan: **No alerts** ✅
- Added proper permissions to example workflow
- All authentication via secure tokens
- HTTPS for all API communications

## File Changes Summary

```
.github/
├── actions/
│   ├── download-translations/
│   │   ├── action.yml (new)
│   │   └── README.md (new)
│   └── upload-translations/
│       ├── action.yml (new)
│       └── README.md (new)
└── workflows/
    └── i18n-sync-example.yml (new)

client-library/src/
└── index.ts (modified - added 3 functions)

docs/
├── GITHUB_ACTIONS.md (new)
└── README.md (modified - added features section)

src/
├── workers.ts (modified - added 2 endpoints)
└── workers.test.ts (new - 6 tests)

vitest.config.ts (new)
```

## Integration Benefits

### For Repository Owners
1. **Simpler setup** - Just use the GitHub Action, no manual client installation
2. **Automatic sync** - Scheduled downloads keep translations up to date
3. **Flexible modes** - Choose between simple JSON or full structured processing
4. **No infrastructure** - Actions run on GitHub's infrastructure

### For the Platform
1. **Easier adoption** - Lower barrier to entry with GitHub Actions
2. **Better developer experience** - Clear documentation and examples
3. **Native JSON support** - Simpler for basic use cases
4. **Bidirectional sync** - Upload source, download translations

## Usage Example

Complete workflow for a project:

```yaml
name: i18n Sync

on:
  push:
    paths: ['locales/en/**']
  schedule:
    - cron: '0 */6 * * *'

jobs:
  upload:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project

  download:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          api-key: ${{ secrets.I18N_PLATFORM_API_KEY }}
          project-name: my-project
```

## Verification

All checks passed:
- ✅ TypeScript type checking
- ✅ Build successful
- ✅ Tests passing (6/6)
- ✅ CodeQL security scan (0 alerts)
- ✅ Workflow permissions configured

## Next Steps

For users to adopt:
1. Add `I18N_PLATFORM_API_KEY` to repository secrets
2. Copy example workflow or create custom workflow
3. Configure file paths as needed
4. Push to trigger first upload
5. Translations sync automatically!
