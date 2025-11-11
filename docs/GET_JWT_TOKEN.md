# How to Get Your JWT Token (Development Only)

⚠️ **IMPORTANT: JWT authentication is only available in DEVELOPMENT environment!**

For production deployments, use OIDC authentication via GitHub Actions workflows.
JWT uploads are disabled in production for security reasons.

## Quick Method (Browser Console)

1. **Open your platform** (http://localhost:5173) and sign in
2. **Press F12** to open DevTools
3. **Go to Console tab**
4. **Paste this code** and press Enter:

```javascript
document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1]
```

5. **Copy the output** - this is your JWT token

## Detailed Method (DevTools)

### Chrome / Edge / Brave

1. Open your platform and sign in with GitHub
2. Press **F12** (or right-click → Inspect)
3. Click the **Application** tab at the top
4. In the left sidebar, expand **Storage** → **Cookies**
5. Click on your site URL (e.g., `http://localhost:5173`)
6. Find the row with Name: **`auth_token`**
7. Click on the **Value** column and copy the entire value

```
Name: auth_token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI...
       ↑ Copy this entire string
```

### Firefox

1. Open your platform and sign in
2. Press **F12**
3. Click the **Storage** tab
4. Expand **Cookies** in the left sidebar
5. Click on your site URL
6. Find **`auth_token`** and copy its value

### Safari

1. Enable Developer menu: Safari → Preferences → Advanced → Show Develop menu
2. Open your platform and sign in
3. Develop → Show Web Inspector
4. Click **Storage** tab
5. Click **Cookies** → your site URL
6. Find **`auth_token`** and copy the value

## What Does the Token Look Like?

A JWT token looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYmMxMjMiLCJ1c2VybmFtZSI6ImpvaG5kb2UiLCJnaXRodWJJZCI6MTIzNDU2LCJpYXQiOjE3MzEyMDAwMDAsImV4cCI6MTczMTI4NjQwMH0.abcdefghijklmnopqrstuvwxyz1234567890
```

It's a long string with three parts separated by dots (`.`):
- **Header** (algorithm and token type)
- **Payload** (user data)
- **Signature** (verification)

## Using the Token (Development Only)

⚠️ **Note:** These examples only work in development environment.
In production, use GitHub Actions with OIDC authentication.

### With upload-dev.js

```bash
cd example-project
node upload-dev.js YOUR_JWT_TOKEN_HERE
```

### With curl

```bash
curl -X POST http://localhost:8787/api/projects/example-project/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### As Environment Variable

```bash
# Set once
export JWT_TOKEN=YOUR_JWT_TOKEN_HERE

# Use in scripts
node upload-dev.js
```

Or in Windows PowerShell:

```powershell
$env:JWT_TOKEN="YOUR_JWT_TOKEN_HERE"
node upload-dev.js
```

## Token Expiration

JWT tokens expire after **24 hours**. If you get an authentication error:

1. Sign out and sign in again
2. Get a fresh token from cookies
3. Use the new token

## Security Notes

⚠️ **Keep your JWT token private!**

- Don't commit it to git
- Don't share it publicly
- Don't paste it in public forums
- It gives full access to your account

The token is like a password - anyone with it can act as you on the platform.

## Troubleshooting

### "Token not found" error

**Problem:** Cookie doesn't exist

**Solution:** 
- Make sure you're signed in
- Check you're on the correct domain
- Try signing out and back in

### "Invalid token" error

**Problem:** Token is expired or malformed

**Solution:**
- Get a fresh token (sign out and back in)
- Make sure you copied the entire token
- Check for extra spaces or line breaks

### "Unauthorized" error

**Problem:** Token is valid but you don't have access, or you're using JWT in production

**Solution:**
- **If in production:** JWT authentication is disabled in production. Use OIDC via GitHub Actions instead.
- **If in development:** Make sure you own the project or are an approved member
- Check project settings

## Production Authentication

For production use, JWT uploads are disabled. Use GitHub Actions with OIDC authentication:

1. Configure your GitHub Actions workflow
2. Use the provided upload-translations action
3. OIDC tokens are automatically generated and verified
4. See `.github/workflows/i18n-sync-example.yml` for examples

**Why OIDC for Production?**
- More secure than JWT tokens
- Automatically verified against GitHub repository
- No manual token management needed
- Prevents unauthorized uploads

---

**Quick Reference:**

```bash
# Get token from browser console (development only)
document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1]

# Use token in development
node upload-dev.js YOUR_TOKEN

# Or
JWT_TOKEN=YOUR_TOKEN node upload-dev.js

# For production: Use GitHub Actions with OIDC instead
```
