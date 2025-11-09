# Translation History Feature

## Overview

The translation history feature provides a complete audit trail of all changes made to each translation key. Users can view who made changes, when they were made, and what actions were taken.

## How to Access History

### In Translation Editor

1. Navigate to the Translation Editor page
2. Select a translation key
3. The history panel is **shown by default** below the translation input
4. The translation input will be pre-filled with the **latest suggestion** from anyone

### Toggle History

- Click **"Hide History"** to collapse the timeline
- Click **"Show History"** to expand it again
- History is automatically fetched when you select a key

## History Timeline

The history panel displays a visual timeline with the following information:

### Timeline Elements

**Visual Indicators**:
- **Blue dots** - Mark each event on the timeline
- **Connecting lines** - Show the flow of events
- **Color-coded badges** - Indicate the type of action

### Action Types

| Action | Icon | Badge Color | Description |
|--------|------|-------------|-------------|
| **submitted** | 📝 | Blue | User submitted a new translation |
| **approved** | ✅ | Green | Maintainer approved the translation |
| **committed** | 🚀 | Purple | Translation was committed to repository |
| **rejected** | ❌ | Red | Translation was rejected |
| **deleted** | 🗑️ | Gray | Translation was deleted |

### Information Displayed

For each history entry:
- **User profile image** - Avatar of the contributor
- **Username** - Who made the change
- **Action type** with icon and badge
- **Translation value** (except for deleted entries)
- **Relative timestamp** (e.g., "2h ago", "3d ago")
- **Absolute timestamp** on hover (full date and time)
- **Commit SHA** (for committed translations)

## History Entry Details

### Submitted
```
[Avatar] john_doe 📝 submitted
"Hola mundo"
2h ago
```
When a user first submits a translation suggestion. Shows the contributor's avatar and username.

### Approved
```
[Avatar] admin ✅ approved
"Hola mundo"
1h ago
```
When a project maintainer approves the translation. Shows who approved it.

### Committed
```
[Avatar] bot 🚀 committed
"Hola mundo"
30m ago
📝 abc1234
```
When the translation is committed to the repository. Includes the commit SHA and shows who committed it.

### Rejected
```
[Avatar] admin ❌ rejected
"Hola mundo"
1d ago
```
When a maintainer rejects the translation. Shows who rejected it.

### Deleted
```
[Avatar] john_doe 🗑️ deleted
3d ago
```
When a user deletes their pending translation. Shows who deleted it.

## Features

### Scrollable Timeline
- History panel has a maximum height of 400px
- Automatically scrolls if there are many entries
- Most recent entries appear at the top

### Empty State
When no history exists:
```
🕐 No history yet
Submit a translation to start tracking history
```

### Loading State
While fetching history:
```
⏳ Loading history...
```

## Use Cases

### 1. Review Changes
See all modifications made to a translation over time.

### 2. Audit Trail
Track who made changes and when for accountability.

### 3. Revert Decisions
Review previous translations if you need to go back.

### 4. Collaboration Insight
Understand the evolution of a translation through team collaboration.

### 5. Quality Control
Maintainers can see the full context before approving translations.

## Technical Details

### API Endpoint
```
GET /api/translations/history?projectId={id}&language={lang}&key={key}
```

### Database
History is stored in the `translation_history` table with:
- Unique ID for each entry
- Reference to the translation
- User who performed the action
- Action type
- Timestamp
- Optional commit SHA

### Performance
- History is automatically fetched when a key is selected
- Uses SolidJS `createResource` for efficient data loading
- Cached until the user changes to a different key

### Default Content Behavior
- When you select a translation key, the input is pre-filled with the **latest suggestion** from any user
- Priority order:
  1. Latest submitted or approved translation from history
  2. Current value from the translation file
  3. Empty (if no translations exist)
- This ensures you always see the most recent community contribution

## Best Practices

### For Contributors
- Check history before submitting to see if similar translations were rejected
- Learn from approved translations to understand project style

### For Maintainers
- Review history to understand context before approving
- Use history to identify patterns in translation quality
- Track which contributors consistently provide good translations

## Future Enhancements

Potential improvements:
- Filter history by action type
- Export history as CSV
- Compare different versions side-by-side
- Add comments to history entries
- Highlight differences between versions
- Show user reputation/contribution stats
