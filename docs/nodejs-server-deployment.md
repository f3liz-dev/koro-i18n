# Node.js Server Deployment Guide

This guide covers deploying the I18n Platform as a traditional Node.js server with Docker containerization, optimized for 2GB RAM constraint.

## Prerequisites

1. **Docker & Docker Compose**: Install from [docker.com](https://www.docker.com/get-docker/)
2. **Node.js 18+**: For local development and building
3. **GitHub OAuth App**: Create at [GitHub Developer Settings](https://github.com/settings/applications/new)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
# Required: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET
```

### 2. Deploy with Docker

```bash
# Basic deployment
npm run deploy:server

# With monitoring (Prometheus + Grafana)
npm run deploy:server:monitoring
```

## Detailed Setup

### Environment Configuration

Create `.env` file with required variables:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_32_chars_min

# Server Configuration
PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173

# Resource Monitoring
MEMORY_LIMIT_MB=2048
ENABLE_METRICS=true
```

### GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create new OAuth App with:
   - **Application name**: I18n Platform
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback`
3. Copy Client ID and Client Secret to `.env`

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# With monitoring stack
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f i18n-platform

# Stop services
docker-compose down
```

### Option 2: Direct Docker

```bash
# Build image
docker build -t i18n-platform .

# Run container with resource limits
docker run -d \
  --name i18n-platform \
  --memory=2g \
  --cpus=2 \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  i18n-platform
```

### Option 3: Local Development

```bash
# Build application
npm run build:server

# Start optimized server
npm run start:optimized

# Or start legacy server
node dist/server/index.js
```

## Resource Optimization Features

### Memory Management
- **Limit**: 2GB RAM constraint enforced
- **Monitoring**: Real-time memory usage tracking
- **Alerts**: Automatic warnings at 80% usage
- **Cleanup**: Forced garbage collection at high usage
- **Shutdown**: Graceful shutdown at 95% usage

### Performance Optimizations
- **Node.js Settings**: `--max-old-space-size=1536` (1.5GB for app, 512MB for system)
- **Request Tracking**: Active request monitoring
- **Slow Query Detection**: Automatic logging of requests >1000ms
- **Error Rate Monitoring**: Track and alert on error patterns

### Container Optimizations
- **Multi-stage Build**: Minimal production image
- **Non-root User**: Security-hardened container
- **Signal Handling**: Proper graceful shutdown with dumb-init
- **Health Checks**: Comprehensive health monitoring
- **Resource Limits**: CPU and memory constraints

## Monitoring and Health Checks

### Built-in Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed metrics
curl http://localhost:3000/api/monitoring/metrics

# Readiness check
curl http://localhost:3000/ready
```

### Health Check Response
```json
{
  "status": "ok",
  "timestamp": "2023-11-07T10:30:00.000Z",
  "uptime": 3600,
  "activeSessions": 5,
  "memory": {
    "used": 512,
    "total": 1024
  }
}
```

### Metrics Response
```json
{
  "uptime": 3600,
  "memory": {
    "used": 512,
    "total": 1024,
    "percentage": 50,
    "limit": 2048
  },
  "requests": {
    "total": 1000,
    "active": 2,
    "errorsLast5Min": 1
  },
  "sessions": {
    "active": 5
  }
}
```

## Monitoring Stack (Optional)

Enable comprehensive monitoring with Prometheus and Grafana:

```bash
# Deploy with monitoring
npm run deploy:server:monitoring

# Access monitoring services
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

### Available Metrics
- **Memory Usage**: Real-time memory consumption
- **Request Rate**: Requests per second
- **Error Rate**: Error percentage over time
- **Response Time**: Request duration percentiles
- **Active Sessions**: Current user sessions

### Alerts Configuration
- **High Memory Usage**: >80% for 5 minutes
- **Critical Memory**: >95% for 1 minute
- **High Error Rate**: >10% for 2 minutes
- **Service Down**: Service unavailable for 1 minute
- **High Response Time**: 95th percentile >2s for 5 minutes

## Scaling and Load Balancing

### Horizontal Scaling

```yaml
# docker-compose.yml scaling
services:
  i18n-platform:
    # ... existing config
    deploy:
      replicas: 3
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - i18n-platform
```

### Load Balancer Configuration

```nginx
# nginx.conf
upstream i18n_platform {
    server i18n-platform_1:3000;
    server i18n-platform_2:3000;
    server i18n-platform_3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://i18n_platform;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **Memory Limit Exceeded**
   ```bash
   # Check memory usage
   docker stats i18n-platform
   
   # View memory alerts in logs
   docker logs i18n-platform | grep "memory"
   ```

2. **Container Won't Start**
   ```bash
   # Check container logs
   docker logs i18n-platform
   
   # Verify environment variables
   docker exec i18n-platform env | grep GITHUB
   ```

3. **Health Check Failures**
   ```bash
   # Test health endpoint manually
   curl -v http://localhost:3000/health
   
   # Check application logs
   docker logs -f i18n-platform
   ```

4. **High Error Rate**
   ```bash
   # View error logs
   docker logs i18n-platform | grep ERROR
   
   # Check metrics endpoint
   curl http://localhost:3000/api/monitoring/metrics
   ```

### Debug Commands

```bash
# Container resource usage
docker stats

# Application logs
docker-compose logs -f i18n-platform

# Execute commands in container
docker exec -it i18n-platform sh

# View container configuration
docker inspect i18n-platform

# Test network connectivity
docker exec i18n-platform wget -qO- http://localhost:3000/health
```

## Production Deployment

### Security Hardening

1. **Environment Variables**: Use Docker secrets or external secret management
2. **Network Security**: Use Docker networks and firewall rules
3. **Container Security**: Regular image updates and vulnerability scanning
4. **Access Control**: Implement proper authentication and authorization

### Backup and Recovery

```bash
# Backup application data (if using volumes)
docker run --rm -v i18n_platform_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# Restore from backup
docker run --rm -v i18n_platform_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && git pull && npm run deploy:server'
```

## Performance Tuning

### Node.js Optimizations
- **Cluster Mode**: Use PM2 for multi-process deployment
- **Memory Tuning**: Adjust `--max-old-space-size` based on available RAM
- **GC Tuning**: Enable `--expose-gc` for manual garbage collection

### Container Optimizations
- **Resource Limits**: Fine-tune CPU and memory limits
- **Image Size**: Use Alpine Linux for smaller images
- **Layer Caching**: Optimize Dockerfile for better build caching

## Next Steps

1. **SSL/TLS**: Configure HTTPS with Let's Encrypt
2. **Domain Setup**: Configure custom domain and DNS
3. **CDN**: Set up CloudFlare or similar CDN
4. **Database**: Add persistent storage if needed
5. **Logging**: Implement centralized logging with ELK stack

For more information, see the [Docker documentation](https://docs.docker.com/) and [Node.js best practices](https://nodejs.org/en/docs/guides/).