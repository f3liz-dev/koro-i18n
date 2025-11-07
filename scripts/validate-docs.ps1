#!/usr/bin/env pwsh
# Validation script for mathematical documentation
# Used in CI/CD pipeline to ensure documentation quality

param(
    [Parameter(Mandatory=$false)]
    [switch]$Strict,
    
    [Parameter(Mandatory=$false)]
    [switch]$CheckLinks
)

$ErrorActionPreference = "Stop"

# Configuration
$DocsDir = "docs/architecture"
$RequiredFiles = @(
    "system-overview.typ",
    "data-models.typ"
)

# Colors for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Check if Typst is installed
function Test-TypstInstalled {
    try {
        $version = typst --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Typst is installed: $version"
            return $true
        }
    } catch {
        Write-Error "Typst is not installed"
        return $false
    }
}

# Check if required files exist
function Test-RequiredFiles {
    Write-Info "Checking required documentation files..."
    $allExist = $true
    
    foreach ($file in $RequiredFiles) {
        $path = Join-Path $DocsDir $file
        if (Test-Path $path) {
            Write-Success "Found: $file"
        } else {
            Write-Error "Missing: $file"
            $allExist = $false
        }
    }
    
    return $allExist
}

# Validate Typst syntax
function Test-TypstSyntax {
    param([string]$FilePath)
    
    Write-Info "Validating syntax: $FilePath"
    
    try {
        $output = typst compile "$FilePath" --root "." 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Syntax valid: $FilePath"
            return $true
        } else {
            Write-Error "Syntax error in: $FilePath"
            Write-Host $output -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Error "Failed to validate: $FilePath"
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Check for version information in documents
function Test-VersionInfo {
    param([string]$FilePath)
    
    Write-Info "Checking version information: $FilePath"
    
    $content = Get-Content $FilePath -Raw
    
    $hasVersion = $content -match "Document Version"
    $hasLastUpdated = $content -match "Last Updated"
    $hasPlatformVersion = $content -match "Platform Version"
    
    if ($hasVersion -and $hasLastUpdated -and $hasPlatformVersion) {
        Write-Success "Version information present: $FilePath"
        return $true
    } else {
        if ($Strict) {
            Write-Error "Missing version information: $FilePath"
            return $false
        } else {
            Write-Warning "Missing version information: $FilePath"
            return $true
        }
    }
}

# Check for mathematical notation consistency
function Test-MathNotation {
    param([string]$FilePath)
    
    Write-Info "Checking mathematical notation: $FilePath"
    
    $content = Get-Content $FilePath -Raw
    
    # Check for common mathematical symbols
    $hasArrows = $content -match "arrow\."
    $hasMathMode = $content -match '\$[^$]+\$'
    
    if ($hasArrows -or $hasMathMode) {
        Write-Success "Mathematical notation found: $FilePath"
        return $true
    } else {
        if ($Strict) {
            Write-Warning "No mathematical notation found: $FilePath"
        }
        return $true
    }
}

# Check for diagram definitions
function Test-DiagramPresence {
    param([string]$FilePath)
    
    Write-Info "Checking for diagrams: $FilePath"
    
    $content = Get-Content $FilePath -Raw
    
    $hasDiagram = $content -match "#diagram\("
    
    if ($hasDiagram) {
        Write-Success "Diagrams present: $FilePath"
        return $true
    } else {
        Write-Info "No diagrams in: $FilePath"
        return $true
    }
}

# Validate cross-references
function Test-CrossReferences {
    param([string]$FilePath)
    
    Write-Info "Checking cross-references: $FilePath"
    
    $content = Get-Content $FilePath -Raw
    
    # Find all references like <name>
    $references = [regex]::Matches($content, '<(\w+)>')
    $definitions = [regex]::Matches($content, 'name:\s*<(\w+)>')
    
    $definedNames = @{}
    foreach ($def in $definitions) {
        $definedNames[$def.Groups[1].Value] = $true
    }
    
    $allValid = $true
    foreach ($ref in $references) {
        $refName = $ref.Groups[1].Value
        if (-not $definedNames.ContainsKey($refName)) {
            Write-Warning "Undefined reference: <$refName> in $FilePath"
            if ($Strict) {
                $allValid = $false
            }
        }
    }
    
    if ($allValid) {
        Write-Success "Cross-references valid: $FilePath"
    }
    
    return $allValid
}

# Main validation process
function Start-DocumentationValidation {
    Write-Info "Starting documentation validation..."
    
    $validationResults = @{
        TypstInstalled = $false
        RequiredFiles = $false
        SyntaxValid = $true
        VersionInfo = $true
        MathNotation = $true
        CrossReferences = $true
    }
    
    # Check Typst installation
    $validationResults.TypstInstalled = Test-TypstInstalled
    if (-not $validationResults.TypstInstalled) {
        Write-Error "Cannot proceed without Typst installation"
        return $false
    }
    
    # Check required files
    $validationResults.RequiredFiles = Test-RequiredFiles
    if (-not $validationResults.RequiredFiles) {
        Write-Error "Required files are missing"
        return $false
    }
    
    # Validate each file
    foreach ($file in $RequiredFiles) {
        $filePath = Join-Path $DocsDir $file
        
        # Syntax validation
        if (-not (Test-TypstSyntax $filePath)) {
            $validationResults.SyntaxValid = $false
        }
        
        # Version information
        if (-not (Test-VersionInfo $filePath)) {
            $validationResults.VersionInfo = $false
        }
        
        # Mathematical notation
        if (-not (Test-MathNotation $filePath)) {
            $validationResults.MathNotation = $false
        }
        
        # Diagrams
        Test-DiagramPresence $filePath | Out-Null
        
        # Cross-references
        if (-not (Test-CrossReferences $filePath)) {
            $validationResults.CrossReferences = $false
        }
    }
    
    # Summary
    Write-Host "`n=== Validation Summary ===" -ForegroundColor Cyan
    
    $allPassed = $true
    foreach ($key in $validationResults.Keys) {
        $status = if ($validationResults[$key]) { "PASS" } else { "FAIL" }
        $color = if ($validationResults[$key]) { "Green" } else { "Red" }
        Write-Host "$key : $status" -ForegroundColor $color
        
        if (-not $validationResults[$key]) {
            $allPassed = $false
        }
    }
    
    if ($allPassed) {
        Write-Success "`nAll validation checks passed!"
        return $true
    } else {
        Write-Error "`nSome validation checks failed"
        return $false
    }
}

# Execute validation
$success = Start-DocumentationValidation

if ($success) {
    exit 0
} else {
    exit 1
}
