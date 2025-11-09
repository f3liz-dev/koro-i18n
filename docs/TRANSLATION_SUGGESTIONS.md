# Translation Suggestions Feature

## Overview

The translation suggestions feature allows multiple users to publicly suggest translations for the same translation key. This creates a collaborative environment where the community can contribute and compare different translation options.

## Key Features

### 1. Multiple Suggestions Per Key
- **Multiple users** can suggest different translations for the same key
- **Same user** can submit multiple translation suggestions for the same key
- All suggestions are stored separately with unique IDs

### 2. Public Visibility
- All translation suggestions are publicly visible to project members
- Each suggestion shows:
  - Username and avatar of the contributor
  - Translation value
  - Status (pending, approved, committed, rejected)
  - Timestamp

### 3. User Control
- Users can **delete their own suggestions** before they are approved
- Once a translation is approved, it cannot be deleted by the user
- Only pending translations can be deleted

### 4. View Modes

#### Grouped View (Default)
- Groups all suggestions by translation key and language
- Shows competing translations side-by-side
- Highlights the most recent suggestion
- Makes it easy to compare different translation options

#### Flat View
- Shows all suggestions in chronological order
- Useful for seeing recent activity across all keys

## How to Use

### Viewing Suggestions

1. Go to your Dashboard
2. Click "View All Suggestions" on any project
3. Use filters to narrow down:
   - **Language**: Filter by specific language or view all
   - **Status**: Show pending, approved, or all suggestions
   - **Search**: Search by key, value, or username

### Submitting a Translation

1. Navigate to the Translation Editor for your project
2. Select a translation key
3. Enter your translation
4. Click "Save"
5. Your suggestion will appear in the suggestions list with "pending" status

### Deleting Your Suggestion

1. Go to the Suggestions page
2. Find your pending suggestion
3. Click the delete button (trash icon)
4. Confirm deletion

**Note**: You can only delete your own suggestions that are still in "pending" status.

## API Endpoints

### Get All Suggestions
```
GET /api/translations/suggestions?projectId={projectId}&language={language}
```

Returns all translation suggestions with user information.

### Delete Translation
```
DELETE /api/translations/{id}
```

Marks a translation as deleted (soft delete). Only the user who created the translation can delete it, and only if it's still pending.

## Database Schema

The `translations` table supports multiple suggestions:
- No unique constraint on `(projectId, language, key)`
- Each suggestion has a unique `id`
- Includes `userId` to track who suggested each translation
- `status` field tracks the lifecycle: pending → approved → committed

## Workflow

1. **Submit**: User submits a translation suggestion (status: pending)
2. **Review**: Project maintainers review all suggestions for a key
3. **Approve**: Maintainer approves the best translation (status: approved)
4. **Commit**: Approved translations are committed to the repository (status: committed)

## Benefits

- **Collaborative**: Multiple contributors can suggest translations
- **Transparent**: All suggestions are visible to the community
- **Flexible**: Users can submit multiple alternatives
- **Quality**: Maintainers can choose the best translation from multiple options
- **Accountable**: Each suggestion is attributed to its author
