# Client Repository Setup

Guide for configuring your translation repository to work with the I18n Platform.

## Quick Setup

### 1. Install Client Library

```bash
npm install -g @i18n-platform/client
```

### 2. Create Configuration

Create `.i18n-platform.toml` in repository root:

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr", "de"]

includePatterns = [
  "locales/**/*.json",
  "src/locales/**/*.json"
]

excludePatterns = [
  "**/node_modules/**",
  "**/dist/**"
]

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
3. Create a project
4. Go to project settings → Generate API key
5. Add to repository secrets:
   - `I18N_PLATFORM_URL`: Your worker URL
   - `I18N_PLATFORM_API_KEY`: Generated key

### 5. Push and Test

```bash
git add .i18n-platform.toml .github/workflows/i18n-upload.yml
git commit -m "feat: Add i18n platform integration"
git push
```

## How It Works

### File Processing

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
```

Uploaded as:
```json
{
  "buttons.save": "Save",
  "buttons.cancel": "Cancel"
}
```

## API Endpoints

### Upload Files

```http
POST /api/projects/:projectName/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "branch": "main",
  "commitSha": "abc123",
  "files": [...]
}
```

### Get Files

```http
GET /api/projects/:projectId/files?branch=main&lang=en
Authorization: Bearer YOUR_JWT_TOKEN
```

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

### Files Not Showing

1. Check upload succeeded in GitHub Actions
2. Verify API key is correct
3. Check file patterns in `.i18n-platform.toml`
4. View platform logs: `wrangler tail`

### Commits Not Working

1. Verify platform has `GITHUB_BOT_TOKEN`
2. Check token has `repo` scope
3. View logs: `wrangler tail`

## Security

- API key stored in repository secrets
- Files uploaded over HTTPS
- Platform authenticates all requests
- Commits use bot token (not user tokens)

---

**Setup complete!** Start translating in the platform. 🌍
