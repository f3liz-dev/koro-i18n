#!/usr/bin/env pwsh
# Test script to verify the documentation system is properly set up

$ErrorActionPreference = "Stop"

function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Info "Testing Mathematical Documentation System..."
Write-Host ""

# Test 1: Check if documentation files exist
Write-Info "Test 1: Checking documentation files..."
$docFiles = @(
    "docs/architecture/system-overview.typ",
    "docs/architecture/data-models.typ",
    "docs/architecture/README.md"
)

$allExist = $true
foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Write-Success "Found: $file"
    } else {
        Write-Error "Missing: $file"
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Error "Some documentation files are missing"
    exit 1
}

Write-Host ""

# Test 2: Check if build scripts exist
Write-Info "Test 2: Checking build scripts..."
$scripts = @(
    "scripts/build-docs.ps1",
    "scripts/build-docs.sh",
    "scripts/validate-docs.ps1"
)

$allExist = $true
foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Success "Found: $script"
    } else {
        Write-Error "Missing: $script"
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Error "Some build scripts are missing"
    exit 1
}

Write-Host ""

# Test 3: Check if CI/CD workflow exists
Write-Info "Test 3: Checking CI/CD workflow..."
if (Test-Path ".github/workflows/docs-validation.yml") {
    Write-Success "Found: .github/workflows/docs-validation.yml"
} else {
    Write-Error "Missing: .github/workflows/docs-validation.yml"
    exit 1
}

Write-Host ""

# Test 4: Check if npm scripts are configured
Write-Info "Test 4: Checking npm scripts..."
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

$requiredScripts = @(
    "docs:build",
    "docs:build:pdf",
    "docs:build:png",
    "docs:validate",
    "docs:watch"
)

$allExist = $true
foreach ($script in $requiredScripts) {
    if ($packageJson.scripts.PSObject.Properties.Name -contains $script) {
        Write-Success "Found npm script: $script"
    } else {
        Write-Error "Missing npm script: $script"
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Error "Some npm scripts are missing"
    exit 1
}

Write-Host ""

# Test 5: Check if .gitignore includes generated docs
Write-Info "Test 5: Checking .gitignore..."
$gitignore = Get-Content ".gitignore" -Raw

if ($gitignore -match "docs/generated/") {
    Write-Success ".gitignore includes docs/generated/"
} else {
    Write-Error ".gitignore missing docs/generated/"
    exit 1
}

Write-Host ""

# Test 6: Check documentation content
Write-Info "Test 6: Checking documentation content..."

$systemOverview = Get-Content "docs/architecture/system-overview.typ" -Raw
$dataModels = Get-Content "docs/architecture/data-models.typ" -Raw

$checks = @(
    @{ Name = "System Overview has diagrams"; Content = $systemOverview; Pattern = "#diagram\(" },
    @{ Name = "System Overview has math notation"; Content = $systemOverview; Pattern = '\$[^$]+\$' },
    @{ Name = "System Overview has version info"; Content = $systemOverview; Pattern = "Document Version" },
    @{ Name = "Data Models has type definitions"; Content = $dataModels; Pattern = '\$\s*"[A-Za-z]+" = \{' },
    @{ Name = "Data Models has math notation"; Content = $dataModels; Pattern = '\$[^$]+\$' },
    @{ Name = "Data Models has version info"; Content = $dataModels; Pattern = "Document Version" }
)

$allPass = $true
foreach ($check in $checks) {
    if ($check.Content -match $check.Pattern) {
        Write-Success $check.Name
    } else {
        Write-Error $check.Name
        $allPass = $false
    }
}

if (-not $allPass) {
    Write-Error "Some content checks failed"
    exit 1
}

Write-Host ""

# Test 7: Verify Typst installation (optional)
Write-Info "Test 7: Checking Typst installation (optional)..."
try {
    $version = typst --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Typst is installed: $version"
        Write-Info "You can build documentation with: npm run docs:build"
    }
} catch {
    Write-Info "Typst is not installed (optional for development)"
    Write-Info "Install from: https://github.com/typst/typst/releases"
    Write-Info "Or use: winget install --id Typst.Typst"
}

Write-Host ""
Write-Success "All documentation system tests passed!"
Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Install Typst if not already installed"
Write-Info "2. Run 'npm run docs:validate' to validate documentation"
Write-Info "3. Run 'npm run docs:build' to generate PDFs and PNGs"
Write-Info "4. Review generated files in docs/generated/"
Write-Host ""

exit 0
