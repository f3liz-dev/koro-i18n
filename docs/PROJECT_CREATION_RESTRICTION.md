# Project Creation Restriction

## Overview

You can restrict project creation to specific users by configuring the `ALLOWED_PROJECT_CREATORS` environment variable in `wrangler.toml`.

## Configuration

### Allow All Users (Default)

Leave the variable empty to allow all authenticated users to create projects:

```toml
[vars]
ALLOWED_PROJECT_CREATORS = ""
```

### Restrict to Specific Users

Add a comma-separated list of GitHub usernames:

```toml
[vars]
ALLOWED_PROJECT_CREATORS = "username1,username2,username3"
```

**Example:**

```toml
[vars]
ALLOWED_PROJECT_CREATORS = "ablaze-f3liz,john-doe,jane-smith"
```

## How It Works

1. **Authentication Check**: User must be authenticated (logged in with GitHub)
2. **Username Comparison**: The system compares the user's GitHub username (case-insensitive) with the allowed list
3. **Access Control**:
   - If list is empty → All users can create projects
   - If list has usernames → Only listed users can create projects
   - Other users get a 403 Forbidden error

## Error Message

Users who are not allowed to create projects will see:

```json
{
  "error": "You do not have permission to create projects. Please contact the administrator."
}
```

## Use Cases

### Single Administrator

```toml
ALLOWED_PROJECT_CREATORS = "admin-username"
```

### Team of Administrators

```toml
ALLOWED_PROJECT_CREATORS = "admin1,admin2,admin3"
```

### Open Platform

```toml
ALLOWED_PROJECT_CREATORS = ""
```

## Notes

- Usernames are case-insensitive
- Whitespace around usernames is automatically trimmed
- This only restricts **creating** new projects
- Users can still:
  - Join existing projects
  - Translate in projects they're members of
  - View projects they have access to

## Deployment

After updating `wrangler.toml`, deploy the changes:

```bash
pnpm run deploy
```

Or for development:

```bash
pnpm run dev:workers
```

## Testing

1. Set `ALLOWED_PROJECT_CREATORS` to a specific username
2. Try to create a project with that user → Should succeed
3. Try to create a project with a different user → Should fail with 403

## Security Considerations

- This is a simple whitelist mechanism
- For more complex access control, consider:
  - Role-based access control (RBAC)
  - Organization-based permissions
  - API keys for programmatic access
