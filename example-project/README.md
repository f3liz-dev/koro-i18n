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

### 2. Set Up GitHub Workflow (No Secrets Required!)

No API keys needed - the workflow uses GitHub OIDC authentication:

1. Copy the example workflow to `.github/workflows/i18n-push.yml`
2. Update `PROJECT_NAME` in the workflow file
3. Commit and push

### 3. Test Upload

#### Option A: Using GitHub Actions (Recommended)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/example-project.git
git push -u origin main
```

The workflow will automatically run and upload translations using the koro CLI.

#### Option B: Manual Local Upload (for testing)

**Using the koro CLI:**

```bash
# Install the koro CLI
npm install -g @koro-i18n/client

# Run koro push
koro push
```

**Or using the client library directly:**

```bash
# Clone the koro-i18n repository
git clone https://github.com/f3liz-dev/koro-i18n.git /tmp/koro-i18n

# Build the client
cd /tmp/koro-i18n/client-library
npm install
npm run build

# Go back to your project
cd -

# Set environment variables
export I18N_PLATFORM_URL=https://koro.f3liz.workers.dev

# Upload
node /tmp/koro-i18n/client-library/dist/cli.js
```

**Note:** For most users, it's recommended to use the GitHub Actions workflow with the koro CLI instead of running the client library directly.

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
gh run list --workflow=i18n-push.yml
gh run view <run-id> --log

# Test locally with koro CLI
npm install -g @koro-i18n/client
koro validate
koro push
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
