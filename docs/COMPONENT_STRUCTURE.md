# Translation Editor Component Structure

## Overview

The TranslationEditorPage has been refactored into smaller, reusable components for better maintainability and mobile responsiveness.

## Component Breakdown

### 1. **TranslationEditorPage** (Main Container)
**Location**: `src/app/pages/TranslationEditorPage.tsx`

**Responsibilities**:
- Main page logic and state management
- Data fetching (translation files, history)
- Keyboard shortcuts (Alt+←/→, Ctrl+S)
- Auto-save functionality
- Orchestrates all child components

**State**:
- `selectedKey` - Currently selected translation key
- `translationValue` - Current translation input value
- `translationStrings` - All translation strings
- `showMobileMenu` - Mobile menu visibility
- `isLoadingFiles` - Loading state

---

### 2. **TranslationEditorHeader**
**Location**: `src/app/components/TranslationEditorHeader.tsx`

**Responsibilities**:
- Display project info and language
- Show completion percentage
- Hamburger menu button (mobile only)
- Back to dashboard button

**Props**:
- `projectId` - Project identifier
- `language` - Target language
- `completionPercentage` - Translation progress (0-100)
- `onMenuToggle` - Callback to toggle mobile menu
- `showMobileMenu` - Current menu state

---

### 3. **TranslationEditorPanel**
**Location**: `src/app/components/TranslationEditorPanel.tsx`

**Responsibilities**:
- Display selected translation key
- Show source text (English)
- Translation input textarea
- Save button
- Navigation buttons (Previous/Next)
- History toggle
- Display translation history panel

**Props**:
- `selectedKey` - Currently selected key
- `translationStrings` - All strings (to find current)
- `language` - Target language
- `translationValue` - Current input value
- `showHistory` - History panel visibility
- `history` - Array of history entries
- `isLoadingHistory` - History loading state
- `currentIndex` - Current position in list
- `totalCount` - Total filtered strings
- `onTranslationChange` - Input change handler
- `onSave` - Save button handler
- `onToggleHistory` - History toggle handler
- `onPrevious` - Previous button handler
- `onNext` - Next button handler

---

### 4. **TranslationList**
**Location**: `src/app/components/TranslationList.tsx`

**Responsibilities**:
- Display list of all translation strings
- Show completion status (✓ for completed)
- Highlight selected item
- Handle item selection

**Props**:
- `translationStrings` - Array of strings to display
- `selectedKey` - Currently selected key (for highlighting)
- `language` - Target language
- `isLoading` - Loading state
- `onSelectKey` - Selection handler

**Features**:
- Sticky on desktop (stays visible while scrolling)
- Scrollable list
- Visual indicators for completed translations

---

### 5. **TranslationHistoryPanel**
**Location**: `src/app/components/TranslationHistoryPanel.tsx`

**Responsibilities**:
- Display translation history timeline
- Show action badges (submitted, approved, committed, etc.)
- Display timestamps (relative and absolute)
- Show commit SHA for committed translations
- Visual timeline with dots and connecting lines

**Props**:
- `history` - Array of history entries
- `isLoading` - Loading state
- `show` - Visibility state

**Features**:
- Timeline visualization with dots
- Color-coded action badges
- Relative time display (e.g., "2h ago")
- Scrollable for long histories
- Empty state when no history exists

---

### 6. **MobileMenuOverlay**
**Location**: `src/app/components/MobileMenuOverlay.tsx`

**Responsibilities**:
- Slide-in menu for mobile devices
- Contains TranslationList component
- Backdrop overlay
- Auto-close on selection

**Props**:
- `show` - Visibility state
- `translationStrings` - Strings to display
- `selectedKey` - Currently selected key
- `language` - Target language
- `isLoading` - Loading state
- `onClose` - Close handler
- `onSelectKey` - Selection handler

**Behavior**:
- Only visible on mobile (< lg breakpoint)
- Slides in from left
- 85% screen width, max 384px
- Closes when backdrop is clicked
- Auto-closes after selecting an item

---

## Mobile vs Desktop Behavior

### Desktop (≥ 1024px)
- **Layout**: Side-by-side (list on left, editor on right)
- **List**: Always visible, sticky positioning
- **Menu Button**: Hidden
- **Navigation**: Click items in list or use keyboard shortcuts

### Mobile (< 1024px)
- **Layout**: Full-screen editor
- **List**: Hidden in hamburger menu
- **Menu Button**: Visible in header
- **Navigation**: 
  - Tap hamburger to open menu
  - Select item (menu auto-closes)
  - Use Previous/Next buttons in editor

---

## Component Hierarchy

```
TranslationEditorPage
├── TranslationEditorHeader
│   └── Hamburger button (mobile)
├── MobileMenuOverlay (mobile only)
│   └── TranslationList
├── TranslationEditorPanel
│   ├── Key display
│   ├── Source text
│   ├── Translation input
│   ├── Navigation buttons
│   ├── Save button
│   └── TranslationHistoryPanel (when toggled)
│       └── Timeline of history entries
└── TranslationList (desktop only)
    └── List of translation strings
```

---

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single, clear responsibility
2. **Reusability**: Components can be reused in other contexts
3. **Testability**: Smaller components are easier to test
4. **Maintainability**: Changes to one component don't affect others
5. **Mobile-First**: Proper mobile UX with hamburger menu
6. **Performance**: Components can be optimized independently

---

## Future Enhancements

Potential improvements:
- Add search/filter in mobile menu
- Implement virtual scrolling for large lists
- Add keyboard navigation in list
- Create a history panel component
- Add bulk edit functionality
