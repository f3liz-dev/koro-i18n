# PowerShell cleanup script for Windows

Write-Host "🧹 Cleaning up old Wrangler cache and build artifacts..." -ForegroundColor Cyan

# Remove Wrangler cache
if (Test-Path ".wrangler") {
    Write-Host "Removing .wrangler/ directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .wrangler
}

# Remove node_modules (optional - uncomment if needed)
# if (Test-Path "node_modules") {
#     Write-Host "Removing node_modules/ directory..." -ForegroundColor Yellow
#     Remove-Item -Recurse -Force node_modules
# }

# Remove dist
if (Test-Path "dist") {
    Write-Host "Removing dist/ directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force dist
}

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run: wrangler dev"
Write-Host "2. Or: npm run dev:workers"
