# API Key System

## Overview

Project-scoped API keys for secure file uploads from GitHub Actions.

## Security Features

### 1. **Project Scoping**
- Each key is tied to a specific project (repository)
- Key can only upload files to its designated project
- Prevents cross-project abuse

### 2. **Rate Limiting**
- Maximum 100 uploads per hour per key
- Prevents abuse and excessive usage
- Returns 429 status when limit exceeded

### 3. **Size Limits**
- Max 100 files per upload
- Max 5MB total payload size
- Prevents storage bombing

### 4. **Hashing**
- Keys stored as SHA-256 hashes
- Plain text key shown only once at creation
- Cannot be recovered if lost

### 5. **Revocation**
- Instant revocation via dashboard
- Revoked keys immediately stop working
- No grace period

### 6. **Audit Trail**
- Every upload logged with timestamp
- Success/failure tracking
- File count and payload size recorded

### 7. **Expiration (Optional)**
- Keys can have expiration dates
- Auto-expire after set period
- Currently optional, can be enforced later

## API Endpoints

### Generate API Key
```http
POST /api/keys
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "projectId": "owner/repo",
  "name": "GitHub Actions"
}

Response:
{
  "success": true,
  "id": "uuid",
  "key": "64-char-hex-string",
  "projectId": "owner/repo",
  "name": "GitHub Actions",
  "message": "Save this key securely. It will not be shown again."
}
```

### List API Keys
```http
GET /api/keys
Authorization: Bearer <user_jwt>

Response:
{
  "keys": [
    {
      "id": "uuid",
      "projectId": "owner/repo",
      "name": "GitHub Actions",
      "lastUsedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": null,
      "revoked": 0
    }
  ]
}
```

### Revoke API Key
```http
DELETE /api/keys/:id
Authorization: Bearer <user_jwt>

Response:
{
  "success": true
}
```

### Upload Files (Using API Key)
```http
POST /api/projects/upload
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "repository": "owner/repo",
  "branch": "main",
  "commitSha": "abc123",
  "files": [
    {
      "filename": "en.toml",
      "filetype": "toml",
      "lang": "en",
      "contents": {"key": "value"},
      "metadata": {}
    }
  ]
}

Response:
{
  "success": true,
  "projectId": "owner/repo",
  "filesUploaded": 1,
  "uploadedAt": "2024-01-01T00:00:00Z"
}
```

## Error Responses

### 401 Unauthorized
- Missing API key
- Invalid API key
- Revoked API key
- Expired API key

### 400 Bad Request
- Missing required fields
- Too many files (>100)

### 413 Payload Too Large
- Payload exceeds 5MB

### 429 Rate Limit Exceeded
- More than 100 uploads in past hour

## Database Schema

### api_keys
```sql
- id: UUID
- userId: Foreign key to users
- projectId: Repository identifier (e.g., "owner/repo")
- keyHash: SHA-256 hash of the key
- name: User-friendly name
- lastUsedAt: Last usage timestamp
- createdAt: Creation timestamp
- expiresAt: Optional expiration
- revoked: 0 = active, 1 = revoked
```

### api_key_usage
```sql
- id: UUID
- apiKeyId: Foreign key to api_keys
- endpoint: API endpoint used
- filesCount: Number of files uploaded
- payloadSize: Size in bytes
- success: 0 = failed, 1 = success
- createdAt: Usage timestamp
```

## Future Enhancements (OIDC Option)

For maximum security, GitHub OIDC can be implemented:
- Short-lived tokens (10 min)
- No static secrets
- Automatic repo verification
- Industry standard

Trade-off: More complex setup for users.

## Usage in GitHub Actions

```yaml
- name: Upload translations
  env:
    I18N_API_KEY: ${{ secrets.I18N_API_KEY }}
  run: |
    npx @i18n-platform/client upload \
      --api-key $I18N_API_KEY \
      --platform-url https://your-worker.workers.dev
```
