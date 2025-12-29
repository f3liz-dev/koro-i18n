# Server Role Architecture

## Overview

This document clarifies the role of the koro-i18n server in the translation management system.

## Key Principle: Diff Management

**The koro-i18n server is a DIFF MANAGEMENT SYSTEM, not a primary storage system.**

```
┌────────────────────────────────────────────────────────────┐
│                     GitHub Repository                       │
│                   (Source of Truth)                         │
│                                                            │
│  ✓ Original translation files (source language)            │
│  ✓ Translated files (target languages)                     │
│  ✓ Complete translation history via Git                    │
│  ✓ Generated metadata (.koro-i18n/)                        │
│    - Manifest (file list)                                  │
│    - Progress files (translated keys per language)         │
│    - Store files (detailed metadata)                       │
└────────────────────────────────────────────────────────────┘
                              │
                              │ GitHub Actions sync
                              ▼
┌────────────────────────────────────────────────────────────┐
│                  Koro-i18n Server (D1)                     │
│                  (Diff Management)                          │
│                                                            │
│  ✓ User-submitted translation suggestions (WebTranslation)│
│  ✓ Approval/rejection status tracking                      │
│  ✓ Translation history for web submissions                 │
│  ✗ Does NOT store original translation files               │
│  ✗ Does NOT replace GitHub as source of truth             │
└────────────────────────────────────────────────────────────┘
```

## Translation Percentage Calculation

### Before (Incorrect)
```typescript
// Only counted koro-i18n database suggestions
translationPercentage = (approvedSuggestionsCount / totalKeys) * 100
```

**Problem**: Ignored existing translations in GitHub repository!

### After (Correct)
```typescript
// Counts both GitHub content AND pending suggestions
const githubTranslatedCount = /* fetch from .koro-i18n/progress-translated/{lang}.jsonl */
const dbDiffCount = /* count approved suggestions in D1 */
const translatedKeys = githubTranslatedCount + dbDiffCount
translationPercentage = (translatedKeys / totalKeys) * 100
```

**Correct**: Reflects actual repository state + pending improvements.

## Data Flow

### 1. User Submits Translation
```
User → koro-i18n Web UI → POST /api/projects/:name/translations
  → Store in D1 (WebTranslation table with status='pending')
```

### 2. Moderator Approves
```
Moderator → PATCH /api/projects/:name/translations/:id
  → Update status='approved' in D1
```

### 3. GitHub Action Syncs
```
GitHub Action → GET /api/projects/:name/apply/export
  → Receive approved diffs
  → Apply to local files
  → Create PR with changes
  → POST /api/projects/:name/apply/committed (mark as synced)
```

### 4. Translation Progress Display
```
Frontend → GET /api/projects/:name/files/summary
  → Fetch GitHub progress-translated files (baseline)
  → Fetch D1 approved suggestions (pending diffs)
  → Calculate: baseline + diffs = total progress
```

## Files Modified

### Core Logic
- `src/routes/files.ts`: Updated summary endpoint to fetch GitHub progress files
- `src/lib/github-repo-fetcher.ts`: Already had `fetchProgressTranslatedFile()` function

### Documentation
- `src/routes/apply.ts`: Added server role clarification
- `src/routes/project-translations.ts`: Added architecture note
- `src/lib/github-pr-service.ts`: Expanded comments
- `prisma/schema.prisma`: Updated WebTranslation model comment

## Implementation Details

### Progress File Format
GitHub generates `.koro-i18n/progress-translated/{lang}.jsonl`:
```jsonl
{"type":"header","language":"ja","totalFiles":2}
{"type":"file","filepath":"locales/<lang>/common.json","keys":["welcome","goodbye"]}
{"type":"file","filepath":"locales/<lang>/auth.json","keys":["login","logout"]}
```

### Matching Logic
```typescript
// Manifest stores filename: "common.json"
// Progress stores filepath: "locales/<lang>/common.json"
// Match by checking if progress filepath ends with manifest filename

const progressBasename = filepath.split('/').pop() || '';
if (progressBasename === mf.filename || 
    filepath.endsWith(`/${mf.filename}`) || 
    filepath === mf.filename) {
  githubTranslatedCount = keys.length;
}
```

## Benefits

1. **Accuracy**: Translation percentage reflects reality (GitHub + pending changes)
2. **Clarity**: Server role is clearly defined as "diff management"
3. **Scalability**: GitHub handles bulk storage, server handles suggestions
4. **Version Control**: Git history preserved for all translations
5. **Down-to-earth**: Simple, maintainable architecture

## Future Considerations

- Progress files might become large for projects with many translations
  - GitHub client library already uses chunking for store files
  - Can apply same pattern to progress files if needed
- Caching strategy for progress files
  - Already uses ETag based on commit SHA
  - No additional caching needed at this time
