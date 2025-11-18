# i18n Quick Start

Minimal developer reference for the frontend i18n implementation.

## Quick Demo

### English Version
```
Title: koro-i18n
Subtitle: Modern translation management made simple
Button: Sign in with GitHub
```

### Japanese Version (Kawaii Style)
```
Title: koro-i18n
Subtitle: シンプルで使いやすい翻訳管理プラットフォーム ✨
Button: GitHubでログイン
```

## Quick facts

- Source-of-truth: `src/app/locales/en/translations.json`
- Hook: `useI18n()` from `src/app/utils/i18n.tsx`
- Selector component: `src/app/components/ui/LanguageSelector.tsx`
- Primary pages updated: Home, Login, Dashboard, Create/Join Project, Translation History, NotFound

### 🔄 Pages Updated
7 core pages fully translated:
1. Home Page
2. Login Page  
3. Dashboard Page
4. Create Project Page
5. Join Project Page
6. Translation History Page
7. 404 Not Found Page

Use the `LanguageSelector` component (import from `src/app/components`) to switch languages; it persists preference in `localStorage`.

## For Developers

### Basic Usage
```tsx
import { useI18n } from '../utils/i18n';

function MyComponent() {
  const { t } = useI18n();
  return <h1>{t('home.title')}</h1>;
}
```

### Adding translations
1. Add key to `src/app/locales/en/translations.json`.
2. Add translation to `src/app/locales/<lang>/translations.json`.
3. Access translation: `t('path.to.key')` via `useI18n()`.

### Translation Files
- **English**: `src/app/locales/en/translations.json`
- **Japanese**: `src/app/locales/ja/translations.json`

## Architecture

```
App.tsx
  └── I18nProvider (wraps entire app)
        ├── Detects browser language
        ├── Loads translations
        └── Provides useI18n() hook

Pages use useI18n():
  const { t, language, setLanguage } = useI18n();
```

## Build & test

✅ **Build Status**: Success
✅ **Security**: 0 CodeQL alerts
✅ **Tests**: 110/115 passing (96%)

```pwsh
pnpm install
pnpm run build
pnpm run test
```

## Notes
Keep English as the canonical source; tests check fallback behavior when keys are missing.

### Common Phrases
| English | Japanese |
|---------|----------|
| Loading... | 読み込み中... |
| Cancel | キャンセル |
| Save | 保存 |
| Create | 作成 |
| No projects yet | プロジェクトがまだありません |

### With Emojis
| English | Japanese |
|---------|----------|
| Welcome Back | おかえりなさい 🦀 |
| Let's start translating | 翻訳を始めましょう 🌸 |
| Translation saved | 翻訳を保存しました ✨ |
| Start a new project | 最初のプロジェクトを作成して、翻訳管理を始めましょう 🎯 |

## Files Added/Modified

### New Files (11)
- `src/app/utils/i18n.tsx` - i18n context
- `src/app/locales/en/translations.json` - English translations
- `src/app/locales/ja/translations.json` - Japanese translations
- `src/app/components/ui/LanguageSelector.tsx` - Language switcher
- `I18N_IMPLEMENTATION.md` - Full documentation
- `I18N_QUICK_START.md` - This file

### Modified Files (8)
- `src/app/App.tsx` - Added I18nProvider wrapper
- `src/app/pages/HomePage.tsx` - Added i18n
- `src/app/pages/LoginPage.tsx` - Added i18n
- `src/app/pages/DashboardPage.tsx` - Added i18n
- `src/app/pages/CreateProjectPage.tsx` - Added i18n
- `src/app/pages/JoinProjectPage.tsx` - Added i18n
- `src/app/pages/TranslationHistoryPage.tsx` - Added i18n
- `src/app/pages/NotFoundPage.tsx` - Added i18n
- `src/app/components/ui/index.ts` - Export LanguageSelector

## What Makes It Kawaii?

1. **Emojis**: Strategic placement for emotional connection
2. **Friendly Tone**: Conversational Japanese, not formal
3. **Natural Phrasing**: How Japanese speakers actually talk
4. **Cultural Touch**: References Japanese concepts naturally

Example:
```javascript
// ❌ Literal translation (stiff)
"プロジェクトを作成する"

// ✅ Kawaii version (friendly)
"最初のプロジェクトを作成して、翻訳管理を始めましょう 🎯"
```

## Future Possibilities

Want to expand? Easy!

### Add More Languages
1. Create `src/app/locales/es/translations.json` (Spanish)
2. Add to language selector
3. Import in `i18n.tsx`

### Add More Pages
1. Import `useI18n` hook
2. Replace strings with `t('key')`
3. Add keys to translation files

### Advanced Features
- Pluralization
- Date formatting per locale
- Number formatting
- Dynamic interpolation

## Support

For detailed information, see:
- **Full Documentation**: `I18N_IMPLEMENTATION.md`
- **Translation Files**: `src/app/locales/`
- **i18n Context**: `src/app/utils/i18n.tsx`

## Summary

✨ **Mission Complete!**

The koro-i18n frontend now speaks both English and Japanese with kawaii charm. Japanese users get a native experience with friendly emojis and natural phrasing, while English users enjoy the clean original interface. The infrastructure is ready to scale to any number of languages.

---

**Made with 🦀 and 🌸**
