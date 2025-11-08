# GitHub API Usage

## Overview

The platform uses GitHub API in a **minimal, read-only** way for users, and only the **bot token** makes changes.

## User OAuth Token Usage

### ✅ What We Use It For

**OAuth Callback Only** (`src/workers.ts`):

1. **Get User Profile**
   ```typescript
   const { data: profile } = await octokit.rest.users.getAuthenticated();
   // Gets: id, login (username), avatar_url
   ```

2. **Get User Email**
   ```typescript
   const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
   // Gets: primary email for co-author attribution
   ```

### ❌ What We DON'T Use It For

- ❌ Reading repository files
- ❌ Writing to repositories
- ❌ Creating commits
- ❌ Creating pull requests
- ❌ Modifying any GitHub data

**User tokens are ONLY for identification and email retrieval.**

## Bot Token Usage

### ✅ What We Use It For

**Cron Job Only** (`src/cron.ts`):

1. **Get Repository Info**
   ```typescript
   const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
   // Gets: default_branch
   ```

2. **Get Latest Commit**
   ```typescript
   const { data: refData } = await octokit.rest.git.getRef({
     owner, repo, ref: `heads/${defaultBranch}`
   });
   // Gets: latest commit SHA
   ```

3. **Read Translation File**
   ```typescript
   const { data: fileData } = await octokit.rest.repos.getContent({
     owner, repo, path: filePath, ref: defaultBranch
   });
   // Gets: current file content and SHA
   ```

4. **Create/Update File (Commit)**
   ```typescript
   await octokit.rest.repos.createOrUpdateFileContents({
     owner, repo, path: filePath,
     message: commitMessage,
     content: base64Content,
     branch: defaultBranch,
     sha: fileSha  // For updates
   });
   // Creates commit with translations
   ```

### Required Permissions

Bot token needs:
- ✅ `repo` scope (full repository access)
- ✅ Write access to target repositories

## Data Flow

### 1. User Authentication

```
User → GitHub OAuth
  ↓
Platform receives token
  ↓
GET /user (profile)
GET /user/emails (email)
  ↓
Store in database:
  - githubId
  - username
  - email
  - avatarUrl
  ↓
Discard user token
(stored encrypted in JWT for future auth, but not used for GitHub API)
```

### 2. Translation Upload

```
Client Repository
  ↓
GitHub Actions
  ↓
@i18n-platform/client
  ↓
POST /api/projects/upload
  ↓
Platform stores in D1
(No GitHub API used)
```

### 3. Translation Submission

```
User translates in UI
  ↓
POST /api/translations
  ↓
Store in D1
(No GitHub API used)
```

### 4. Batch Commit

```
Cron (every 5 min)
  ↓
Fetch approved translations from D1
  ↓
Use BOT TOKEN:
  - Get repo info
  - Get latest commit
  - Read current file
  - Merge translations
  - Create commit
  ↓
Update D1 with commit SHA
```

## Security

### User Token
- ✅ Only used during OAuth callback
- ✅ Never stored in database
- ✅ Encrypted in JWT (for future auth only)
- ✅ Never used for GitHub API after initial auth
- ✅ Minimal scope: `user:email`

### Bot Token
- ✅ Stored as Cloudflare secret
- ✅ Only used by cron job
- ✅ Full `repo` scope (needed for commits)
- ✅ Separate from user tokens
- ✅ Can be rotated independently

## OAuth Scopes

### User OAuth App

**Requested Scope:** `user:email`

**Why:** To get user's email for co-author attribution in commits

**What it allows:**
- Read user profile
- Read user email addresses

**What it does NOT allow:**
- Read repositories
- Write to repositories
- Access private data

### Bot Token

**Required Scope:** `repo`

**Why:** To commit translations to repositories

**What it allows:**
- Read repository contents
- Write to repositories
- Create commits

**Used by:** Cron job only (not users)

## Verification

### Check User Token Usage

```bash
# Search for user token usage
grep -r "payload.accessToken" src/

# Should only appear in:
# - JWT generation (for storage)
# - No GitHub API calls
```

### Check Bot Token Usage

```bash
# Search for bot token usage
grep -r "GITHUB_BOT_TOKEN" src/

# Should only appear in:
# - src/cron.ts (for commits)
```

## Best Practices

1. ✅ **Minimal Permissions** - User tokens have minimal scope
2. ✅ **Separation of Concerns** - User tokens for auth, bot token for commits
3. ✅ **No User Token Storage** - Only encrypted in JWT
4. ✅ **Bot Token Isolation** - Only cron job has access
5. ✅ **Audit Trail** - All commits logged in D1

## Comparison with Other Platforms

### Crowdin
- ❌ Requires full `repo` scope from users
- ❌ Uses user tokens to read/write repositories
- ❌ Users grant write access

### Our Platform
- ✅ Users only grant `user:email` scope
- ✅ Bot token handles all repository operations
- ✅ Users never grant write access
- ✅ More secure, less permissions

## Summary

**User Tokens:**
- Purpose: Identification + email only
- Scope: `user:email`
- Usage: OAuth callback only
- Storage: Encrypted in JWT (not used for API)

**Bot Token:**
- Purpose: Commit translations
- Scope: `repo`
- Usage: Cron job only
- Storage: Cloudflare secret

**Result:** Minimal permissions, maximum security! 🔒
