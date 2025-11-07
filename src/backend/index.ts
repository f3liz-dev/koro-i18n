/**
 * Backend entry point - Standard Hono server (legacy)
 * For production deployments, use optimized-server.ts instead
 */

import dotenv from 'dotenv';
import { startHonoServer } from './hono-server.js';
import type { HonoServerConfig } from './hono-server.js';

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
const config: HonoServerConfig = {
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
  
  console.warn('⚠️  Using legacy server. For production, use optimized-server.ts');
  console.warn('⚠️  Run: node dist/server/optimized-server.js');
  
  startHonoServer(config, port).catch(error => {
    console.error('Failed to start Hono server:', error);
    process.exit(1);
  });
}

// Export for testing and external use
export * from './api/hono-auth.js';
export * from './middleware/hono-auth.js';
export * from './services/AuthService.js';
export * from './services/MemoryUserRepository.js';
export * from './services/MemorySessionStore.js';
export * from './types/User.js';
export { createHonoApp, startHonoServer } from './hono-server.js';
export { OptimizedServer, createOptimizedServer } from './optimized-server.js';