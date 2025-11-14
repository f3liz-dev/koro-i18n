# Get JWT Token for Development

For local development uploads, you need a JWT token.

## Steps

1. **Sign in to the platform**
   - Open http://localhost:5173
   - Sign in with GitHub

2. **Open DevTools Console**
   - Press F12
   - Go to Console tab

3. **Get the token**
   - Paste this code and press Enter:
   ```javascript
   document.cookie.split("; ").find(row => row.startsWith("auth_token=")).split("=")[1]
   ```

4. **Copy the output**
   - This is your JWT token

5. **Use for uploads**
   ```bash
   JWT_TOKEN=<your-token> node upload-dev.js
   ```

## Note

- JWT tokens are only for development
- Production uses OIDC (GitHub Actions)
- Tokens expire after 7 days
