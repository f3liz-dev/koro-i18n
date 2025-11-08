# Client Repository Setup Guide

This guide explains how to configure your translation repository to work with the I18n Platform.

## Architecture Overview

The I18n Platform uses a **push/pull** architecture:

1. **Client pushes** → Processed translation files uploaded to platform API
2. **Platform stores** → Files stored in D1 database (always up-to-date)
3. **Users translate** → Submit translations via web interface
4. **Cron pulls** → Approved translations committed back to repository
5. **Client logs** → Translation history kept in repository

## Quick Setup

### 1. Install Client Library

```bash
npm install -g @i18n-platform/client
```

### 2. Create Configuration

Create `.i18n-platform.toml` in your repository root:

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr", "de", "zh", "ko"]

# File patterns to process
includePatterns = [
  "locales/**/*.json",
  "src/locales/**/*.json"
]

excludePatterns = [
  "**/node_modules/**",
  "**/dist/**"
]

# Output pattern for committed translations
# {lang} = language code, {file} = filename
outputPattern = "locales/{lang}/{file}"
```

### 3. Add GitHub Actions Workflow

Create `.github/workflows/i18n-upload.yml`:

```yaml
name: Upload Translations

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - '.i18n-platform.toml'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install client
        run: npm install -g @i18n-platform/client
      
      - name: Upload translations
        env:
          I18N_PLATFORM_URL: ${{ secrets.I18N_PLATFORM_URL }}
          I18N_PLATFORM_API_KEY: ${{ secrets.I18N_PLATFORM_API_KEY }}
        run: i18n-upload
```

### 4. Get API Key

1. Go to I18n Platform
2. Sign in with GitHub
3. Go to Settings → API Keys
4. Generate new API key
5. Add to repository secrets:
   - Name: `I18N_PLATFORM_API_KEY`
   - Value: Your API key

### 5. Push and Test

```bash
git add .i18n-platform.toml .github/workflows/i18n-upload.yml
git commit -m "feat: Add i18n platform integration"
git push
```

The workflow will run and upload your translation files!

## How It Works

### File Processing

The client library:

1. **Reads** files matching `includePatterns`
2. **Parses** JSON/Markdown into key-value pairs
3. **Flattens** nested structures:
   ```json
   // Before
   {"buttons": {"save": "Save"}}
   
   // After
   {"buttons.save": "Save"}
   ```
4. **Uploads** to platform API

### Upload Format

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "commit": "abc123...",
  "sourceLanguage": "en",
  "targetLanguages": ["ja", "es"],
  "files": [
    {
      "filetype": "json",
      "filename": "common.json",
      "lang": "en",
      "contents": {
        "welcome": "Welcome",
        "buttons.save": "Save"
      },
      "metadata": {
        "size": 1024,
        "keys": 2
      }
    }
  ]
}
```

### Translation Workflow

```
1. Client uploads source files
   ↓
2. Platform stores in D1
   ↓
3. User translates in web UI
   ↓
4. Reviewer approves
   ↓
5. Cron commits to GitHub (every 5 min)
   ↓
6. Client workflow runs again
   ↓
7. Updated files uploaded
```

## Repository Structure

```
your-repo/
├── .i18n-platform.toml          # Configuration
├── .github/
│   └── workflows/
│       └── i18n-upload.yml      # Upload workflow
├── locales/
│   ├── en/                      # Source language
│   │   ├── common.json
│   │   └── messages.json
│   ├── ja/                      # Target language
│   │   ├── common.json
│   │   └── messages.json
│   └── es/                      # Target language
│       ├── common.json
│       └── messages.json
└── .i18n-logs/                  # Generated logs (optional)
    ├── commits.json
    └── contributors.json
```

## Supported File Formats

### JSON

```json
{
  "welcome": "Welcome",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

Uploaded as:
```json
{
  "welcome": "Welcome",
  "buttons.save": "Save",
  "buttons.cancel": "Cancel"
}
```

### Markdown

```markdown
# Buttons
- save: Save
- cancel: Cancel

# Messages
- welcome: Welcome
```

Uploaded as:
```json
{
  "buttons.save": "Save",
  "buttons.cancel": "Cancel",
  "messages.welcome": "Welcome"
}
```

## Translation Logs (Optional)

Keep translation history in your repository:

```yaml
- name: Generate logs
  run: |
    mkdir -p .i18n-logs
    git log --grep="feat(i18n):" --pretty=format:'...' > .i18n-logs/commits.json

- name: Commit logs
  run: |
    git add .i18n-logs/
    git commit -m "chore: Update logs [skip ci]"
    git push
```

## API Endpoints

### Upload Files (Client → Platform)

```http
POST /api/projects/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "repository": "owner/repo",
  "files": [...]
}
```

### Get Files (Platform → Client)

```http
GET /api/projects/owner%2Frepo/files?branch=main&lang=en
Authorization: Bearer YOUR_JWT_TOKEN
```

### Pull Translations (Cron → GitHub)

Cron job automatically:
1. Fetches approved translations from D1
2. Groups by project/language/file
3. Reads current file from D1
4. Merges translations
5. Commits via GitHub API

## Troubleshooting

### Upload Fails

```bash
# Check workflow logs
gh run list --workflow=i18n-upload.yml
gh run view <run-id> --log

# Test locally
export I18N_PLATFORM_API_KEY=your-key
i18n-upload
```

### Files Not Showing in Platform

1. Check upload succeeded in GitHub Actions
2. Verify API key is correct
3. Check file patterns in `.i18n-platform.toml`
4. View platform logs: `wrangler tail`

### Commits Not Working

1. Verify platform has `GITHUB_BOT_TOKEN`
2. Check token has `repo` scope
3. View cron logs: `wrangler tail --config wrangler.cron.toml`

## Best Practices

1. **Upload on every change** - Trigger workflow on translation file changes
2. **Keep logs** - Commit `.i18n-logs/` for history
3. **Review commits** - Platform includes co-authors
4. **Monitor workflow** - Check GitHub Actions regularly
5. **Update config** - Keep `.i18n-platform.toml` current

## Security

- API key stored in repository secrets
- Files uploaded over HTTPS
- Platform authenticates all requests
- Commits use bot token (not user tokens)

## Example Repositories

See `client-library/` for:
- Full source code
- TypeScript types
- CLI implementation
- Tests

## Support

For issues:
1. Check GitHub Actions logs
2. Test client library locally
3. View platform logs
4. Contact support

## Next Steps

1. ✅ Setup complete
2. Upload files
3. Translate in platform
4. Approve translations
5. Watch commits appear!
