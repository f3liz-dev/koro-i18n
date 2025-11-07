# Multi-stage build optimized for 2GB RAM constraint
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and TypeScript configs
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY vite.config.ts ./
COPY vitest.config.ts ./

# Build the application
RUN npm run build:server

# Production stage optimized for resource constraints
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling and resource monitoring tools
RUN apk add --no-cache dumb-init procps

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and clean cache
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy environment configuration
COPY --chown=nodejs:nodejs .env.example ./.env.example

# Switch to non-root user
USER nodejs

# Set Node.js memory limit for 2GB container (leave 512MB for system)
ENV NODE_OPTIONS="--max-old-space-size=1536 --enable-source-maps"

# Set production environment
ENV NODE_ENV=production

# Expose port (using 3000 to match server configuration)
EXPOSE 3000

# Enhanced health check with timeout and resource monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: 3000, \
      path: '/health', \
      timeout: 5000 \
    }; \
    const req = http.request(options, (res) => { \
      let data = ''; \
      res.on('data', chunk => data += chunk); \
      res.on('end', () => { \
        try { \
          const health = JSON.parse(data); \
          process.exit(health.status === 'ok' ? 0 : 1); \
        } catch { process.exit(1); } \
      }); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => { req.destroy(); process.exit(1); }); \
    req.end(); \
  "

# Use dumb-init to handle signals properly for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]

# Start the optimized server
CMD ["node", "dist/optimized-server-entry.js"]