/**
 * Main server entry point
 * Uses the new consolidated structure with src/config/server.ts
 */

import dotenv from 'dotenv';
import { startHonoServer } from './config/server.js';
import type { ServerConfig } from './config/server.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Server configuration
const config: ServerConfig = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
  },
  jwtSecret: process.env.JWT_SECRET!,
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']
};

// Start server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000', 10);
  
  startHonoServer(config, port).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export for testing and external use
export * from './api/routes/hono-auth.js';
export * from './api/middleware/hono-auth.js';
export * from './api/services/AuthService.js';
export * from './api/services/MemoryUserRepository.js';
export * from './api/services/MemorySessionStore.js';
export * from './lib/types/auth.js';
export { createHonoApp, startHonoServer } from './config/server.js';
export { OptimizedServer, createOptimizedServer } from './config/server.js';
