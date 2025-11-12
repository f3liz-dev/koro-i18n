# Getting Translations Guide

This guide explains how to get translations in different languages using Koro i18n platform.

## Overview

Koro i18n platform uses a three-step workflow to access and translate your project files:

1. **Select Project** - Choose which project to work on
2. **Select Language** - Choose the target language to translate
3. **Select File** - Choose specific files to translate

Each step displays completion percentage to help you track translation progress.

## Translation Workflow

### Step 1: Select Project

1. Sign in to the Koro i18n platform with your GitHub account
2. Navigate to the Dashboard (`/dashboard`)
3. You'll see a list of:
   - Projects you own
   - Projects you're a member of
4. Click on a project to proceed to language selection

### Step 2: Select Language

After selecting a project, you'll see all available target languages (excluding the source language).

**What you'll see:**
- List of all languages with translations
- Completion percentage for each language
- Number of translated keys vs. total keys
- Progress bar showing translation status

**Color coding:**
- 🟢 Green (90%+): Nearly complete
- 🟡 Yellow (50-89%): In progress
- 🔴 Red (<50%): Needs work

**Note:** The source language (e.g., `en` for English) is automatically filtered out and won't appear as a translatable language.

### Step 3: Select File

After selecting a language, you'll see all files that need translation for that language.

**What you'll see:**
- List of all files in the project
- Completion percentage for each file
- Number of translated keys per file
- Progress bar for each file

Click on a file to start translating.

### Step 4: Translate

In the translation editor:
- View source text (from source language)
- Enter translations
- See translation history
- Save translations for review

Your translations will be reviewed and committed automatically every 5 minutes.

## Setting Up Languages

### Configure Source Language

The source language is the language you write your original content in (typically English).

**Default:** `en` (English)

**To change the source language:**

Currently, the source language defaults to `en`. To support other source languages, you'll need to ensure your project files are properly organized:

1. Upload your source language files using GitHub Actions
2. Name your language files with the appropriate language code (e.g., `ja`, `es-MX`, `fr`)
3. The platform will automatically detect available languages

### Add New Target Languages

To add support for a new target language:

1. **Upload translation files** for the new language using GitHub Actions
2. **Configure in `.koro-i18n.repo.config.toml`:**

```toml
sourceLanguage = "en"
targetLanguages = ["ja", "es", "fr", "de", "zh-CN"]  # Add your new language here

includePatterns = [
  "locales/**/*.json"
]

outputPattern = "locales/{lang}/{file}"
```

3. **Create the language directory structure:**

```
locales/
  ├── en/           # Source language (will not appear in selection)
  │   ├── common.json
  │   └── errors.json
  ├── ja/           # Japanese - will appear in language selection
  │   ├── common.json
  │   └── errors.json
  ├── es/           # Spanish - will appear in language selection
  │   ├── common.json
  │   └── errors.json
  └── fr/           # French - will appear in language selection
      ├── common.json
      └── errors.json
```

4. **Push your changes:**

```bash
git add locales/ .koro-i18n.repo.config.toml
git commit -m "feat: Add support for new languages"
git push
```

The GitHub Actions workflow will automatically upload the new language files.

## Language Code Reference

Use standard language codes (BCP 47) for your translations:

| Language | Code | Example |
|----------|------|---------|
| English | `en` | Source language |
| English (US) | `en-US` | Regional variant |
| Japanese | `ja` | Target language |
| Spanish | `es` | Target language |
| Spanish (Mexico) | `es-MX` | Regional variant |
| French | `fr` | Target language |
| German | `de` | Target language |
| Chinese (Simplified) | `zh-CN` | Target language |
| Chinese (Traditional) | `zh-TW` | Target language |
| Korean | `ko` | Target language |
| Portuguese | `pt` | Target language |
| Portuguese (Brazil) | `pt-BR` | Regional variant |

## Checking Translation Progress

### In the Web Interface

1. Navigate to your project
2. View the language selection page to see overall progress per language
3. Select a language to see progress per file
4. Use the color-coded percentages to identify which files need attention

### Using the API

You can also check translation progress programmatically:

```bash
# Get all files for a specific language
curl -X GET "https://koro.f3liz.workers.dev/api/projects/my-project/files?lang=ja" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The response will include all files with their contents, allowing you to calculate completion percentage.

## Downloading Translations

### Automatic Download via GitHub Actions

Set up a scheduled workflow to automatically download completed translations:

```yaml
name: Download Translations

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  download:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: f3liz-dev/koro-i18n/.github/actions/download-translations@main
        with:
          project-name: my-project
          commit-message: 'chore: Update translations'
```

### Manual Download

You can also download translations manually using the API:

```bash
# Download all languages
curl -X GET "https://koro.f3liz.workers.dev/api/projects/my-project/download?branch=main" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Download specific language
curl -X GET "https://koro.f3liz.workers.dev/api/projects/my-project/download?branch=main&language=ja" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

### 1. Organize by Language and File

```
locales/
  ├── en/
  │   ├── common.json    # Shared translations
  │   ├── errors.json    # Error messages
  │   └── pages/
  │       ├── home.json
  │       └── about.json
  ├── ja/
  │   └── [same structure as en/]
  └── es/
      └── [same structure as en/]
```

### 2. Keep Source Language Updated

Always update your source language files first, then translate to other languages:

1. Update `locales/en/*.json`
2. Commit and push
3. GitHub Actions uploads to platform
4. Translators work on other languages
5. Download completed translations

### 3. Use Meaningful Keys

```json
{
  "button.save": "Save",           // Good: descriptive
  "button.cancel": "Cancel",       // Good: descriptive
  "btn1": "Save",                  // Bad: unclear
  "b2": "Cancel"                   // Bad: unclear
}
```

### 4. Add Context in Comments

While JSON doesn't support comments natively, use descriptive keys:

```json
{
  "auth.login.button": "Sign In",
  "auth.login.title": "Welcome Back",
  "auth.login.subtitle": "Please sign in to continue"
}
```

### 5. Regular Sync

Set up automated workflows to keep translations in sync:

- Upload source language on every commit
- Download translations every 6 hours
- Review and merge translation PRs weekly

## Troubleshooting

### Language Not Showing in Selection

**Problem:** A language you uploaded doesn't appear in the language selection page.

**Solutions:**
1. Verify files were uploaded successfully (check GitHub Actions logs)
2. Ensure the language code is different from the source language
3. Check that files contain actual content (not empty)
4. Refresh the page or clear browser cache

### Source Language Appearing in Selection

**Problem:** The source language (e.g., `en`) appears in the translatable languages list.

**Solution:** This should not happen. If it does:
1. Check that the project's `sourceLanguage` field is set correctly
2. Report this as a bug

### Incorrect Completion Percentage

**Problem:** The completion percentage doesn't match your expectations.

**Explanation:** Completion is calculated as:
```
percentage = (translated_keys / total_source_keys) * 100
```

Where:
- `translated_keys` = number of keys with non-empty values in target language
- `total_source_keys` = total number of keys in source language

**Note:** Empty strings count as "not translated"

### Cannot Access Translation Editor

**Problem:** Clicking on a file doesn't open the translation editor.

**Solutions:**
1. Ensure you're logged in
2. Check that you have access to the project (owner or approved member)
3. Verify the URL format is correct: `/projects/{project}/translate/{lang}/{file}`
4. Check browser console for errors

## Getting Help

If you need assistance:

1. **Documentation:** Check the [main README](../docs/README.md) and [GitHub Actions guide](./GITHUB_ACTIONS.md)
2. **GitHub Issues:** Open an issue at https://github.com/f3liz-dev/koro-i18n/issues
3. **Examples:** Review the [example project](../example-project/)

## Related Documentation

- [GitHub Actions Integration](./GITHUB_ACTIONS.md) - Automated upload/download
- [Client Setup](./CLIENT_SETUP.md) - Repository configuration
- [Deployment Guide](./DEPLOYMENT.md) - Platform deployment
- [Main README](./README.md) - Platform overview

---

**Happy translating!** 🌍
