# Example Project - I18n Platform Testing

This is a simple example project for testing the I18n Platform.

## Structure

```
example-project/
├── locales/
│   ├── en/              # English (source language)
│   │   ├── common.json
│   │   └── auth.json
│   ├── ja/              # Japanese
│   │   └── common.json
│   └── es/              # Spanish
│       └── common.json
├── .koro-i18n.repo.config.toml  # Configuration
└── .github/
    └── workflows/
        └── i18n-upload.yml  # GitHub Actions workflow
```

## Setup Instructions

### 1. Register Project in Platform

1. Go to your I18n Platform instance
2. Sign in with GitHub
3. Click "Add Project"
4. Fill in:
   - **Name**: `example-project`
   - **Repository**: `your-username/example-project`
5. Click "Add"

### 2. Get API Key

1. Go to project settings
2. Click "Generate API Key"
3. Copy the key (shown only once!)

### 3. Configure GitHub Repository

If using GitHub Actions, add these secrets to your repository:

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `I18N_PLATFORM_URL`: Your platform URL (e.g., `https://i18n-platform.workers.dev`)
   - `I18N_PLATFORM_API_KEY`: The API key from step 2

### 4. Test Upload

#### Option A: Using GitHub Actions

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/example-project.git
git push -u origin main
```

The workflow will automatically run and upload translations.

#### Option B: Manual Upload (for testing)

**Using the development script (recommended for local testing):**

```bash
# 1. Get your JWT token from browser
# - Open browser DevTools (F12)
# - Go to Application/Storage → Cookies
# - Copy the value of 'auth_token'

# 2. Upload files
node upload-dev.js YOUR_JWT_TOKEN

# Or set as environment variable
JWT_TOKEN=YOUR_JWT_TOKEN node upload-dev.js
```

**Using the client library (for production):**

Since the client library is not published to npm, you need to build it from the koro-i18n repository:

```bash
# Clone the koro-i18n repository
git clone https://github.com/f3liz-dev/koro-i18n.git /tmp/koro-i18n

# Build and install the client
cd /tmp/koro-i18n/client-library
npm install
npm run build
npm link

# Go back to your project
cd -

# Set environment variables
export I18N_PLATFORM_URL=https://koro.f3liz.workers.dev
export OIDC_TOKEN=your-oidc-token

# Upload
i18n-upload
```

**Note:** For most users, it's recommended to use the GitHub Actions integration instead of the client library directly. See [../docs/GITHUB_ACTIONS.md](../docs/GITHUB_ACTIONS.md) for details.

## Testing Translation Workflow

### 1. View Files in Platform

1. Go to platform dashboard
2. Click on "example-project"
3. Select language (e.g., "ja")
4. You should see all translation keys

### 2. Submit a Translation

1. Find a missing translation (e.g., auth.json keys in Japanese)
2. Enter translation
3. Click "Save" (auto-saves every 30 seconds)

### 3. Approve Translation

1. Go to "Pending" tab
2. Review the translation
3. Click "Approve"

### 4. Wait for Commit

- Cron job runs every 5 minutes
- Approved translations are committed to GitHub
- Check your repository for the new commit

### 5. Verify Update

1. Pull latest changes: `git pull`
2. Check `locales/ja/auth.json` for new translations
3. GitHub Actions will re-upload (keeping everything in sync)

## Translation Keys

### common.json (15 keys)
- `welcome`
- `goodbye`
- `buttons.save`
- `buttons.cancel`
- `buttons.delete`
- `buttons.edit`
- `messages.success`
- `messages.error`
- `messages.loading`
- `navigation.home`
- `navigation.about`
- `navigation.contact`
- `navigation.settings`

### auth.json (13 keys)
- `login.title`
- `login.email`
- `login.password`
- `login.submit`
- `login.forgot`
- `register.title`
- `register.username`
- `register.email`
- `register.password`
- `register.confirm`
- `register.submit`
- `errors.invalid`
- `errors.required`
- `errors.email`

## Expected Behavior

### Initial State
- English: 28 keys (100% complete)
- Japanese: 15 keys (54% complete) - missing auth.json
- Spanish: 15 keys (54% complete) - missing auth.json

### After Translation
- Users translate missing keys
- Reviewers approve translations
- Cron commits to GitHub
- Files updated automatically

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

1. Check upload succeeded
2. Verify API key is correct
3. Check file patterns in `.koro-i18n.repo.config.toml`
4. View platform logs: `wrangler tail`

### Commits Not Working

1. Verify platform has `GITHUB_BOT_TOKEN`
2. Check token has `repo` scope
3. View cron logs: `wrangler tail --config wrangler.cron.toml`

## Next Steps

1. ✅ Register project in platform
2. ✅ Upload files
3. ✅ Translate missing keys
4. ✅ Approve translations
5. ✅ Watch commits appear!

---

**Happy translating!** 🌍
