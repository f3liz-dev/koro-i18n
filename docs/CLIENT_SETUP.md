# Client Repository Setup

Guide for configuring your translation repository to work with the I18n Platform.

## Quick Setup

### 1. Recommended: Use GitHub Actions

The easiest way to integrate with Koro i18n is to use the provided reusable GitHub Actions:

Create `.github/workflows/i18n-sync.yml`:

```yaml
name: i18n Sync

on:
  push:
    branches: [main]
    paths:
      - 'locales/en/**'  # Source language
  schedule:
    - cron: '0 */6 * * *'  # Download translations every 6 hours
  workflow_dispatch:

jobs:
  upload-source:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/upload-translations@main
        with:
          project-name: my-project

  download-translations:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          project-name: my-project
```

**No secrets needed!** The actions use GitHub OIDC for secure authentication.

See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for more details.

### 2. Alternative: Manual Client Library Setup

If you need to use the client library directly (not recommended for most users):

The `@i18n-platform/client` package is **not published to npm**. Instead, you need to build it from the repository:

```yaml
- name: Checkout koro-i18n client library
  uses: actions/checkout@v4
  with:
    repository: f3liz-dev/koro-i18n
    path: .koro-i18n-client
    sparse-checkout: |
      client-library
    sparse-checkout-cone-mode: false

- name: Build and install client
  run: |
    cd .koro-i18n-client/client-library
    npm install
    npm run build
    npm link
    cd ../..

- name: Upload translations
  env:
    I18N_PLATFORM_URL: https://koro.f3liz.workers.dev
    OIDC_TOKEN: ${{ steps.oidc.outputs.token }}
  run: i18n-upload
```

### 3. Create Configuration

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

### 4. Get Project Set Up

1. Go to Koro i18n Platform
2. Sign in with GitHub
3. Create a project
4. Set the repository to match your GitHub repository (e.g., `owner/repo`)
5. Note your project name

### 5. Push and Test

```bash
git add .i18n-platform.toml .github/workflows/i18n-sync.yml
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
3. View cron logs: `wrangler tail --config wrangler.cron.toml`

## Security

- API key stored in repository secrets
- Files uploaded over HTTPS
- Platform authenticates all requests
- Commits use bot token (not user tokens)

---

**Setup complete!** Start translating in the platform. 🌍
