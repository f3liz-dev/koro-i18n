# Koro i18n - Data-Oriented Programming Refactoring

## Overview

This refactoring applies **Data-Oriented Programming (DOP)** principles inspired by Kotlin and Julia to create a simpler, more maintainable codebase with fewer bugs.

## DOP Principles Applied

### 1. Separate Data from Functions
- **Before**: Large classes/modules with mixed concerns
- **After**: Pure data structures + pure functions operating on them

### 2. Prefer Pure Functions
- **Before**: Side effects scattered throughout
- **After**: Pure functions that are easy to test and compose

### 3. Explicit I/O Boundaries
- **Before**: I/O mixed with business logic
- **After**: Clear separation between I/O operations and data transformations

### 4. Composition Over Inheritance
- **Before**: Large files with everything in one place
- **After**: Small modules that compose together

## Refactored Modules

### 1. GitHub Service (was `github-repo-fetcher.ts` - 908 lines)

**Before**: Monolithic file with 20+ exported functions

**After**: Organized into focused modules

```
src/lib/github/
├── types.ts              # Pure data structures
├── client.ts             # Basic GitHub operations
├── manifest.ts           # Manifest parsing (pure + I/O)
├── file-service.ts       # File operations (pure + I/O)
├── metadata.ts           # Metadata construction (pure + I/O)
├── translation-service.ts # High-level compositions
└── index.ts              # Clean exports
```

**Benefits**:
- Each module < 200 lines
- Pure functions testable in isolation
- Clear dependencies
- Easy to understand flow

### 2. File Routes (was `files.ts` - 755 lines)

**Before**: Single file with manifest, streaming, and summary logic

**After**: Split into focused route modules

```
src/routes/
├── manifest.ts           # Manifest endpoints (~100 lines)
├── file-stream.ts        # File streaming (~100 lines)
├── summary.ts            # Translation progress (~120 lines)
└── files-new.ts          # Main router (~25 lines)
```

**Benefits**:
- Each route file has single responsibility
- Easy to add new endpoints
- Clear separation of concerns

### 3. Summary Service (new)

```typescript
// Pure functions for translation progress calculation
export function calculateLanguageSummary(...)
export function buildProjectSummary(...)
export function groupByLanguage(...)
```

**Benefits**:
- Zero side effects
- Easy to test with any data
- Reusable across different contexts

### 4. Reconciliation Service (extracted from routes)

**Before**: 150+ lines of nested logic in route handler

**After**: Pure functions with clear data flow

```typescript
// Clear data structures
interface GitHubTranslation { ... }
interface D1Translation { ... }
interface ReconciledTranslation { ... }

// Pure transformation
export function reconcileTranslations(
  githubTranslations: GitHubTranslation[],
  d1Translations: D1Translation[]
): ReconciledTranslation[]
```

**Benefits**:
- Testable without database or GitHub
- Logic is crystal clear
- Easy to add new reconciliation rules

## Code Quality Improvements

### Pure Functions Example

```typescript
// BEFORE: Mixed I/O and logic
async function fetchAndProcessFile(octokit, path) {
  const file = await fetchFile(octokit, path); // I/O
  const parsed = JSON.parse(file.content);     // Transform
  const flattened = flattenObject(parsed);     // Transform
  const hash = await calculateHash(parsed);    // Transform
  return { parsed, flattened, hash };
}

// AFTER: Separated I/O and pure functions
// I/O operation
async function fetchFile(octokit, path): Promise<GitHubFile>

// Pure transformations
function parseJson(content: string): object
function flattenObject(obj: object): Record<string, string>
async function calculateHash(content: string): Promise<string>

// Composition
const file = await fetchFile(octokit, path);
const parsed = parseJson(file.content);
const flattened = flattenObject(parsed);
const hash = await calculateHash(file.content);
```

### Simplified Reconciliation

```typescript
// BEFORE: Nested if-else with side effects (150+ lines)
function reconcile(github, d1) {
  let result = [];
  for (let key in github) {
    if (d1[key]) {
      if (d1[key].status === 'approved') {
        // ... complex logic
      } else {
        // ... more complex logic
      }
    } else {
      // ... yet more logic
    }
  }
  // ... continues for many lines
}

// AFTER: Clear pipeline of pure functions
function reconcileTranslations(github, d1) {
  const githubMap = new Map(github.map(t => [t.key, t]));
  const d1Map = groupByKey(d1);
  const allKeys = getAllKeys(githubMap, d1Map);
  
  return allKeys
    .map(key => reconcileKey(key, githubMap.get(key), d1Map.get(key)))
    .sort((a, b) => a.key.localeCompare(b.key));
}
```

## Bug Reduction Strategies

### 1. Type Safety
```typescript
// Explicit types prevent runtime errors
interface GitHubTranslation {
  key: string;
  value: string;
  sourceHash: string;
}
```

### 2. Pure Functions = No Hidden State
```typescript
// Pure function - same input always gives same output
function filterByStatus(
  translations: Reconciled[],
  filter: StatusFilter
): Reconciled[] {
  // No side effects, no hidden dependencies
}
```

### 3. Immutable Data Flow
```typescript
// Data flows through pipeline, never mutated
const result = data
  |> parse
  |> transform
  |> filter
  |> sort;
```

### 4. Fail Fast with Validation
```typescript
// Validate at boundaries
if (!manifest) {
  return c.json({ error: 'Not found' }, 404);
}
// Now TypeScript knows manifest is not null
```

## Migration Guide

### Old Code
```typescript
import { fetchSingleFileFromGitHub } from '../lib/github-repo-fetcher';
```

### New Code
```typescript
import * as GitHub from '../lib/github';

// Use composed high-level functions
const file = await GitHub.TranslationService.fetchTranslationFile(...);

// Or use low-level functions directly
const manifest = await GitHub.Manifest.fetchManifest(...);
const entry = GitHub.Manifest.findFileEntry(manifest, lang, filename);
```

## File Organization

```
src/
├── durable-objects/          # Cloudflare Durable Objects
│   ├── OAuthStateDO.ts
│   ├── JWKSCacheDO.ts
│   └── GitHubRateLimitDO.ts
├── lib/
│   ├── github/               # GitHub services (DOP pattern)
│   │   ├── types.ts          # Data structures
│   │   ├── client.ts         # Basic operations
│   │   ├── manifest.ts       # Manifest logic
│   │   ├── file-service.ts   # File operations
│   │   ├── metadata.ts       # Metadata construction
│   │   ├── translation-service.ts
│   │   └── index.ts
│   ├── summary-service.ts    # Pure summary functions
│   ├── reconciliation-service.ts # Pure reconciliation functions
│   ├── github-rate-limit.ts  # Rate limiting utilities
│   └── ... (other utilities)
├── routes/
│   ├── manifest.ts           # Manifest routes
│   ├── file-stream.ts        # Streaming routes
│   ├── summary.ts            # Summary routes
│   ├── files-new.ts          # Main file router
│   └── ... (other routes)
└── workers.ts                # Main entry point
```

## Testing Benefits

### Before
```typescript
// Hard to test - requires GitHub API, database, etc.
test('reconciliation', async () => {
  const octokit = mockOctokit();
  const prisma = mockPrisma();
  // ... complex setup
});
```

### After
```typescript
// Easy to test - pure functions with plain data
test('reconciliation', () => {
  const github = [{ key: 'a', value: '1', sourceHash: 'x' }];
  const d1 = [{ key: 'a', value: '2', status: 'pending', ... }];
  
  const result = reconcileTranslations(github, d1);
  
  expect(result).toEqual([...]);
});
```

## Performance Benefits

1. **Easier to optimize**: Pure functions can be memoized
2. **Better caching**: Clear data dependencies
3. **Parallel processing**: No shared state means safe concurrency
4. **Smaller bundles**: Tree-shaking works better with modules

## Maintenance Benefits

1. **Easy to understand**: Each function does one thing
2. **Safe to refactor**: Pure functions can't break other code
3. **Easy to extend**: Add new functions without touching existing ones
4. **Clear debugging**: Pure functions are deterministic

## Summary

This refactoring transformed a 908-line monolithic file and 755-line route file into:
- **12 focused modules** (each < 200 lines)
- **Pure functions** for business logic
- **Clear I/O boundaries**
- **Easy to test and maintain**
- **Type-safe throughout**

The result is code that is:
- ✅ **Simpler** - easier to understand
- ✅ **Safer** - fewer bugs
- ✅ **Testable** - pure functions
- ✅ **Maintainable** - focused modules
- ✅ **Composable** - building blocks for features
