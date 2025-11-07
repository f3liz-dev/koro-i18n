# Cloudflare Workers deployment script for Windows
# Implements serverless deployment with environment variable handling

param(
    [string]$Environment = "production"
)

Write-Host "🚀 Deploying I18n Platform to Cloudflare Workers..." -ForegroundColor Green

# Check if wrangler is installed
try {
    wrangler --version | Out-Null
} catch {
    Write-Host "❌ Wrangler CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Cloudflare
try {
    wrangler whoami | Out-Null
} catch {
    Write-Host "❌ Not logged in to Cloudflare. Please run:" -ForegroundColor Red
    Write-Host "wrangler login" -ForegroundColor Yellow
    exit 1
}

# Build the project with Vite
Write-Host "📦 Building project with Vite..." -ForegroundColor Blue
npm run build:workers

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Vite build failed!" -ForegroundColor Red
    exit 1
}

# Check if required secrets are set
Write-Host "🔐 Checking required secrets..." -ForegroundColor Blue

$RequiredSecrets = @("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "JWT_SECRET")
$MissingSecrets = @()

foreach ($secret in $RequiredSecrets) {
    $secretList = wrangler secret list 2>$null
    if (-not ($secretList -match $secret)) {
        $MissingSecrets += $secret
    }
}

if ($MissingSecrets.Count -gt 0) {
    Write-Host "❌ Missing required secrets. Please set them using:" -ForegroundColor Red
    foreach ($secret in $MissingSecrets) {
        Write-Host "wrangler secret put $secret" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "For GitHub OAuth:" -ForegroundColor Cyan
    Write-Host "1. Create a GitHub OAuth App at https://github.com/settings/applications/new"
    Write-Host "2. Set Authorization callback URL to: https://your-worker-domain.workers.dev/api/auth/callback"
    Write-Host "3. Use the Client ID and Client Secret as GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
    Write-Host ""
    Write-Host "For JWT_SECRET, generate a secure random string (32+ characters)" -ForegroundColor Cyan
    exit 1
}

# Deploy based on environment
switch ($Environment.ToLower()) {
    { $_ -in @("development", "dev") } {
        Write-Host "🔧 Deploying to development environment..." -ForegroundColor Blue
        wrangler deploy --env development
    }
    "staging" {
        Write-Host "🔧 Deploying to staging environment..." -ForegroundColor Blue
        wrangler deploy --env staging
    }
    { $_ -in @("production", "prod") } {
        Write-Host "🔧 Deploying to production environment..." -ForegroundColor Blue
        wrangler deploy
    }
    default {
        Write-Host "❌ Invalid environment: $Environment" -ForegroundColor Red
        Write-Host "Valid options: development, staging, production" -ForegroundColor Yellow
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your I18n Platform is now running on Cloudflare Workers" -ForegroundColor Cyan
    Write-Host "📊 Monitor your deployment at: https://dash.cloudflare.com/" -ForegroundColor Cyan
    Write-Host "📝 View logs with: wrangler tail" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}