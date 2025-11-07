# Traditional Node.js server deployment script for Windows
# Implements containerized deployment with resource monitoring

param(
    [string]$Environment = "production",
    [switch]$WithMonitoring = $false,
    [switch]$Build = $true
)

Write-Host "🚀 Deploying I18n Platform Traditional Server..." -ForegroundColor Green

# Check if Docker is installed and running
try {
    docker --version | Out-Null
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not installed or not running. Please install Docker Desktop." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "❌ Docker Compose is not available. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Validate environment file
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "📝 Please edit .env file with your configuration before continuing." -ForegroundColor Cyan
        Write-Host "Required variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET" -ForegroundColor Cyan
        exit 1
    } else {
        Write-Host "❌ No .env or .env.example file found." -ForegroundColor Red
        exit 1
    }
}

# Build the application if requested
if ($Build) {
    Write-Host "📦 Building application..." -ForegroundColor Blue
    npm run build:server
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}

# Build Docker image
Write-Host "🐳 Building Docker image..." -ForegroundColor Blue
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Determine compose profiles
$profiles = @()
if ($WithMonitoring) {
    $profiles += "monitoring"
    Write-Host "📊 Enabling monitoring services (Prometheus + Grafana)..." -ForegroundColor Blue
}

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Blue

if ($profiles.Count -gt 0) {
    $profileArgs = "--profile " + ($profiles -join " --profile ")
    $command = "docker-compose $profileArgs up -d"
} else {
    $command = "docker-compose up -d"
}

Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 I18n Platform API: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🏥 Health Check: http://localhost:3000/health" -ForegroundColor Cyan
    Write-Host "📊 Metrics: http://localhost:3000/api/monitoring/metrics" -ForegroundColor Cyan
    
    if ($WithMonitoring) {
        Write-Host "📈 Prometheus: http://localhost:9090" -ForegroundColor Cyan
        Write-Host "📊 Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "📝 Useful commands:" -ForegroundColor Yellow
    Write-Host "  View logs: docker-compose logs -f i18n-platform" -ForegroundColor Gray
    Write-Host "  Stop services: docker-compose down" -ForegroundColor Gray
    Write-Host "  Restart: docker-compose restart i18n-platform" -ForegroundColor Gray
    Write-Host "  View metrics: docker stats" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "📝 Check logs with: docker-compose logs" -ForegroundColor Yellow
    exit 1
}