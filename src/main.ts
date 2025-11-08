import dotenv from 'dotenv';
import { startServer } from './server.js';

dotenv.config();

const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing: ${key}`);
    process.exit(1);
  }
}

startServer({
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  },
  jwtSecret: process.env.JWT_SECRET!,
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  port: parseInt(process.env.PORT || '3000', 10),
});
