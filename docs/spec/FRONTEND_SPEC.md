# Frontend Specification

This document provides a complete specification for the koro-i18n frontend, a lightweight i18n translation platform.

## Overview

The frontend is a single-page application (SPA) that provides a user interface for managing translation projects, viewing and editing translations, and collaborating with team members.

**Technology Stack**:
- Vanilla HTML5, CSS3, JavaScript (ES2020+)
- No external JavaScript frameworks required
- Responsive CSS with CSS Grid and Flexbox
- Progressive Web App (PWA) capabilities

**Design Principles**:
1. **Lightweight**: Minimal JavaScript, fast load times (<2 seconds)
2. **Accessible**: WCAG 2.1 AA compliant
3. **Responsive**: Works on 320px mobile to 4K desktop
4. **Offline-capable**: Core functionality works offline with cached data

---

## Routes

| Path | Page | Authentication |
|------|------|----------------|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/dashboard` | Dashboard | Required |
| `/projects/new` | Create Project | Required |
| `/projects/:name` | Project View | Required |
| `/projects/:name/translations` | Translations List | Required |
| `/projects/:name/translations/:lang/editor` | Translation Editor | Required |

---

## Pages

### Home Page (`/`)

**Purpose**: Landing page introducing the platform.

**UI Components**:
- Header with brand logo and navigation
- Hero section with title and description
- Call-to-action buttons (Get Started, Read Docs)
- Footer with copyright

**Interactions**:
- "Get Started" → Navigate to `/login`
- "Read Docs" → Navigate to `/docs`

---

### Login Page (`/login`)

**Purpose**: User authentication via GitHub OAuth.

**UI Components**:
- Centered card container
- Page title "Sign in to your account"
- GitHub OAuth button
- Loading state during redirect

**Interactions**:
- "Sign in with GitHub" → Redirect to `/api/auth/github`

**State**:
- Loading: Show spinner during OAuth redirect

---

### Dashboard Page (`/dashboard`)

**Purpose**: Display user's projects and provide navigation.

**UI Components**:
- Header with "Dashboard" title
- "New Project" button (top right)
- Project grid (3 columns on desktop, 1 on mobile)
- Empty state when no projects exist
- Loading spinner during data fetch

**Data Requirements**:
- API: `GET /api/projects`

**UI States**:
1. **Loading**: Spinner centered
2. **Empty**: Icon, title "No projects yet", description
3. **Error**: Error message with retry option
4. **Loaded**: Grid of project cards

**Project Card**:
- Project name (bold, link)
- Project description
- Status badge ("Active")
- Click → Navigate to `/projects/:name`

---

### Create Project Page (`/projects/new`)

**Purpose**: Form to create a new translation project.

**UI Components**:
- Centered card container (max-width: 32rem)
- Page title "Create New Project"
- Form fields:
  - Project Name (text input, required)
  - Repository (text input, required, format: `owner/repo`)
  - Description (textarea, optional)
- Cancel button → Navigate to `/dashboard`
- Submit button "Create Project"
- Error message display

**Validation**:
- Name: Required, alphanumeric with dashes/underscores
- Repository: Required, `owner/repo` format

**Data Requirements**:
- API: `POST /api/projects`

**UI States**:
1. **Idle**: Form ready for input
2. **Submitting**: Button disabled, show "Creating..."
3. **Error**: Show error message, enable form
4. **Success**: Navigate to `/dashboard`

---

### Project View Page (`/projects/:name`)

**Purpose**: Overview of a single project with navigation to features.

**UI Components**:
- Page title with project name
- Project description (if available)
- Navigation buttons:
  - Translations
  - Files
  - Members
  - Apply
- Project information card
- Loading and error states

**Data Requirements**:
- API: `GET /api/projects` (filter by name)

**UI States**:
1. **Loading**: Spinner
2. **Not Found**: Empty state with "Project not found"
3. **Loaded**: Project details and navigation

---

### Translation Editor Page (`/projects/:name/translations/:lang/editor`)

**Purpose**: View and edit translations for a specific language/file.

**UI Components**:
- Header with:
  - Page title (filename or "Languages")
  - Project name and language info
  - "Back to Project" button
- Search/filter input
- Translation list:
  - Each row shows:
    - Translation key (code chip style)
    - Source text (secondary color)
    - Target text input (textarea)
    - Save button

**Query Parameters**:
- `?filename=common.json` - Filter to specific file

**Navigation Modes**:
1. **Language List** (no language selected):
   - Show grid of language cards
   - Click card → Navigate to language files
   
2. **File List** (language selected, no filename):
   - Show grid of file cards for that language
   - Click card → Navigate to file editor
   
3. **Translation Editor** (filename specified):
   - Show list of translation key/value pairs
   - Editable textarea for each translation
   - Save button per translation

**Data Requirements**:
- No filename: `GET /api/projects/:name/translations/counts`
- With filename: `GET /api/projects/:name/translations/file/:lang/:filename`

**Interactions**:
- Filter input → Filter translations by key or value
- Edit textarea → Update local state
- Save button → `POST /api/projects/:name/translations`

**UI States**:
1. **Loading**: Spinner
2. **Error**: Error message
3. **Empty**: "No translations found"
4. **Loaded**: Translation grid

---

## Shared Components

### Header

**Elements**:
- Brand link (logo/text) → `/`
- Navigation links:
  - Authenticated: "Dashboard" link, username
  - Not authenticated: "Login" link

**Behavior**:
- Sticky position
- Backdrop blur on scroll
- Responsive (hide nav on mobile)

---

### Footer

**Elements**:
- Copyright text
- Centered alignment

---

### Button Variants

| Variant | Usage |
|---------|-------|
| `primary` | Primary actions (Save, Create) |
| `ghost` | Secondary actions (Cancel, Back) |
| `success` | Positive actions (Approve) |
| `danger` | Destructive actions (Delete, Reject) |
| `sm` | Small buttons |
| `lg` | Large buttons |

---

### Form Elements

**Input**:
- Full width
- Rounded corners
- Focus state with accent border and shadow
- Placeholder styling

**Textarea**:
- Same styling as input
- Resizable vertically

**Label**:
- Block display
- Semi-bold weight
- Margin bottom

---

### Cards

**Standard Card**:
- White background
- Border and shadow
- Rounded corners (16px)
- Padding (1.5rem)

**Interactive Card**:
- Standard card + hover effects
- Border color change on hover
- Slight lift transform

---

### Messages/Alerts

| Type | Usage |
|------|-------|
| `success` | Positive feedback |
| `error` | Error messages |
| `warning` | Warnings |
| `info` | Informational |

---

### Empty State

**Structure**:
- Centered container
- Icon (emoji or SVG)
- Title
- Description
- Optional action button

---

### Loading Spinner

**Implementation**:
- Rotating border animation
- Primary color accent
- Centered in container

---

## State Management

### Authentication State

```javascript
// Possible states
const AuthState = {
  CHECKING: 'checking',    // Initial load, checking auth
  LOGGED_IN: 'loggedIn',   // User authenticated
  LOGGED_OUT: 'loggedOut'  // User not authenticated
};

// User data (when logged in)
const user = {
  id: string,
  username: string,
  githubId: number
};
```

### Page State Pattern

Each page manages its own state:

```javascript
const PageState = {
  loading: boolean,
  error: string | null,
  data: any
};
```

---

## API Integration

### Fetch Wrapper

All API calls should:
1. Include credentials (for cookies)
2. Set `Content-Type: application/json` for POST/PATCH
3. Handle 401 by redirecting to login
4. Handle errors gracefully

```javascript
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}
```

---

## Routing

### Client-Side Router

Implement simple hash-based or history API routing:

```javascript
const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/dashboard': DashboardPage,
  '/projects/new': CreateProjectPage,
  '/projects/:name': ProjectViewPage,
  '/projects/:name/translations': TranslationsPage,
  '/projects/:name/translations/:lang/editor': TranslationEditorPage
};
```

### Route Guards

Protected routes should:
1. Check authentication state
2. Redirect to `/login` if not authenticated
3. Show loading state while checking auth

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Columns |
|------------|-------|---------|
| Mobile | < 768px | 1 |
| Tablet | 768px - 1023px | 2 |
| Desktop | ≥ 1024px | 3 |

### Mobile Adaptations

- Hide header navigation, show hamburger menu
- Single column layouts
- Larger touch targets (min 44px)
- Reduced padding

---

## Accessibility

### Requirements

1. **Keyboard Navigation**: All interactive elements focusable
2. **ARIA Labels**: Proper labeling for screen readers
3. **Color Contrast**: WCAG AA compliance (4.5:1 text)
4. **Focus Indicators**: Visible focus states
5. **Semantic HTML**: Proper heading hierarchy

### Focus Management

- Trap focus in modals
- Return focus after dialogs close
- Skip navigation link

---

## Performance

### Targets

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Bundle Size**: < 50KB (uncompressed)

### Optimizations

1. Inline critical CSS
2. Lazy load non-critical JavaScript
3. Use system fonts
4. Optimize images (WebP, lazy loading)
5. Cache API responses where appropriate

---

## Error Handling

### User-Facing Errors

1. Network errors: "Connection failed. Please check your internet."
2. Authentication errors: "Session expired. Please log in again."
3. Validation errors: Show specific field errors
4. Server errors: "Something went wrong. Please try again."

### Error Recovery

- Retry buttons for failed requests
- Auto-retry with exponential backoff
- Graceful degradation for offline

---

## Browser Support

### Minimum Versions

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement

- Core functionality works without JavaScript (forms, links)
- Enhanced experience with JavaScript enabled
- Fallback for unsupported features
