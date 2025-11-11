# Testing Guide

Quick guide for testing the I18n Platform with the example project.

## Example Project

The `example-project/` directory contains a complete example with:

- **English** (source): 28 translation keys across 2 files
- **Japanese**: 15 keys (54% complete)
- **Spanish**: 15 keys (54% complete)

## Quick Test (5 minutes)

### 1. Initialize Local Database

```bash
# Initialize schema (if not done already)
npx wrangler d1 execute koro-i18n-db --file=schema.sql --local

# Run migration for project management
npx wrangler d1 execute koro-i18n-db --file=docs/migrate-project-members.sql --local
```

### 2. Start Platform Locally

```bash
# Terminal 1: Start worker
wrangler dev

# Terminal 2: Start frontend
npm run dev
```

### 2. Register Project

1. Go to http://localhost:5173
2. Sign in with GitHub
3. Click "Add Project"
4. Fill in:
   - **Name**: `example-project`
   - **Repository**: `your-username/example-project`
5. Click "Add"

### 3. Test Upload (Simulated)

```bash
cd example-project
node test-upload.js
```

This shows what would be uploaded to the platform.

### 4. Upload Files

**Option A: Using the development script (easiest)**

```bash
cd example-project

# Get JWT token from browser cookies (auth_token)
# Then run:
node upload-dev.js YOUR_JWT_TOKEN
```

**Option B: Using curl**

```bash
# Get your JWT token from browser cookies (auth_token)

curl -X POST http://localhost:8787/api/projects/example-project/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "main",
    "commitSha": "test123",
    "files": [
      {
        "filetype": "json",
        "filename": "common.json",
        "lang": "en",
        "contents": {
          "welcome": "Welcome to our app",
          "goodbye": "Goodbye"
        },
        "metadata": {
          "keys": 2
        }
      }
    ]
  }'
```

### 5. View in Platform

1. Go to dashboard
2. Click "example-project"
3. Select language (e.g., "ja")
4. You should see translation keys

### 6. Test Translation Workflow

1. **Submit**: Enter a translation for a missing key
2. **Approve**: Go to pending tab and approve it
3. **Commit**: Wait 5 minutes (or trigger cron manually)
4. **Verify**: Check that translation was committed

## Test Scenarios

### Scenario 1: New Translation

1. Find missing key (e.g., `auth.login.title` in Japanese)
2. Enter translation: "サインイン"
3. Save (auto-saves)
4. Status should be "pending"

### Scenario 2: Approval

1. Go to pending translations
2. Review translation
3. Click "Approve"
4. Status changes to "approved"

### Scenario 3: Batch Commit

1. Approve multiple translations
2. Wait for cron (5 min) or trigger manually
3. Check GitHub for commit
4. Verify all approved translations are included

### Scenario 4: History

1. Go to history page
2. Filter by project/language/key
3. See complete audit trail
4. Verify all actions are logged

## Manual Cron Trigger

For testing without waiting 5 minutes:

```bash
# Trigger cron worker directly
curl http://localhost:8787/cron/commit-translations
```

Or run the cron worker:

```bash
wrangler dev --config wrangler.cron.toml
```

## Database Inspection

```bash
# View all translations
npm run db:query -- --command="SELECT * FROM translations" --local

# View by status
npm run db:query -- --command="SELECT status, COUNT(*) FROM translations GROUP BY status" --local

# View history
npm run db:query -- --command="SELECT * FROM translation_history ORDER BY createdAt DESC LIMIT 10" --local

# View projects
npm run db:query -- --command="SELECT * FROM projects" --local

# View project members
npm run db:query -- --command="SELECT * FROM project_members" --local
```

## Test Project Management

### Test User Join Request

1. Create project as User A
2. Sign in as User B (different GitHub account)
3. Click "Join Project"
4. Find the project and click "Request to Join"
5. Sign back in as User A
6. Go to project → "Manage"
7. See User B in "Pending" tab
8. Click "Approve"
9. User B should now have access

### Test Whitelist Mode

1. Create project (default: whitelist)
2. User B requests to join
3. Before approval, User B cannot see project files
4. After approval, User B can translate

### Test Blacklist Mode

1. Go to project → "Manage"
2. Change to "Blacklist" mode
3. All users can access by default
4. Reject specific users to block them

## Expected Results

### After Upload
- Dashboard shows project with file count
- Can view all translation keys
- Progress shows 54% for ja/es (15/28 keys)

### After Translation
- New translations appear in pending list
- Can edit/delete before approval
- Auto-save works every 30 seconds

### After Approval
- Translation moves to approved list
- Ready for commit
- Cannot edit (must delete and resubmit)

### After Commit
- Translation status changes to "committed"
- Appears in GitHub repository
- History shows complete timeline

## Troubleshooting

### Upload Fails

```bash
# Check logs
wrangler tail

# Verify project exists
npm run db:query -- --command="SELECT * FROM projects WHERE name='example-project'" --local
```

### Files Not Showing

```bash
# Check project_files table
npm run db:query -- --command="SELECT * FROM project_files WHERE projectId='example-project'" --local
```

### Cron Not Running

```bash
# Check cron logs
wrangler tail --config wrangler.cron.toml

# Verify approved translations exist
npm run db:query -- --command="SELECT * FROM translations WHERE status='approved'" --local
```

## Performance Testing

### Load Test

```bash
# Submit 100 translations
for i in {1..100}; do
  curl -X POST http://localhost:8787/api/translations \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"example-project\",\"language\":\"ja\",\"key\":\"test.key.$i\",\"value\":\"テスト$i\"}"
done

# Check database
npm run db:query -- --command="SELECT COUNT(*) FROM translations" --local
```

### Batch Commit Test

```bash
# Approve all pending
npm run db:query -- --command="UPDATE translations SET status='approved' WHERE status='pending'" --local

# Trigger cron
curl http://localhost:8787/cron/commit-translations

# Verify all committed
npm run db:query -- --command="SELECT status, COUNT(*) FROM translations GROUP BY status" --local
```

## Clean Up

```bash
# Delete test data
npm run db:query -- --command="DELETE FROM translations WHERE projectId='example-project'" --local
npm run db:query -- --command="DELETE FROM project_files WHERE projectId='example-project'" --local
npm run db:query -- --command="DELETE FROM projects WHERE name='example-project'" --local
```

---

**Happy testing!** 🧪
