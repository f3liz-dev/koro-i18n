/**
 * Main server entry point
 * Consolidated configuration and startup logic
 */

import dotenv from 'dotenv';
import { createOptimizedServer } from './server.js';
import type { ServerConfig } from './server.js';

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
    console.error(`❌ Missing required environment variable: ${envVar}`);
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

// Server settings
const port = parseInt(process.env.PORT || '3000', 10);
const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB || '2048', 10);

// Start optimized server
async function startServer() {
  try {
    console.log('🚀 Starting I18n Platform Server...');
    console.log(`📊 Memory limit: ${memoryLimitMB}MB`);
    console.log(`🌐 Port: ${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    const server = await createOptimizedServer(config, port, memoryLimitMB);
    await server.start();
    
    // Log initial metrics
    const metrics = server.getMetrics();
    console.log('📈 Initial metrics:', {
      memory: `${metrics.memory.used}MB / ${metrics.memory.limit}MB (${metrics.memory.percentage}%)`,
      uptime: `${Math.round(metrics.uptime)}s`
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

// Export for external use
export * from './server.js';
export * from './workers.js';