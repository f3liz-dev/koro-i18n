#!/usr/bin/env pwsh
# Build script for mathematical documentation
# Generates PDF and PNG outputs from Typst source files

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('pdf', 'png', 'all')]
    [string]$Format = 'all',
    
    [Parameter(Mandatory=$false)]
    [switch]$Watch,
    
    [Parameter(Mandatory=$false)]
    [switch]$Validate
)

$ErrorActionPreference = "Stop"

# Configuration
$DocsDir = "docs/architecture"
$OutputDir = "docs/generated"
$TypstFiles = @(
    "system-overview.typ",
    "data-models.typ"
)

# Colors for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

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
        Write-Info "Install Typst from: https://github.com/typst/typst/releases"
        Write-Info "Or use: winget install --id Typst.Typst"
        return $false
    }
}

# Validate Typst syntax
function Test-TypstSyntax {
    param([string]$FilePath)
    
    Write-Info "Validating syntax: $FilePath"
    
    try {
        # Compile to check syntax without generating output
        $result = typst compile "$FilePath" --root "." 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Syntax valid: $FilePath"
            return $true
        } else {
            Write-Error "Syntax error in: $FilePath"
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Error "Failed to validate: $FilePath"
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Build PDF from Typst
function Build-TypstPdf {
    param([string]$InputFile, [string]$OutputFile)
    
    Write-Info "Building PDF: $InputFile -> $OutputFile"
    
    try {
        typst compile "$InputFile" "$OutputFile" --root "."
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Generated: $OutputFile"
            return $true
        } else {
            Write-Error "Failed to generate: $OutputFile"
            return $false
        }
    } catch {
        Write-Error "Build failed: $InputFile"
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Build PNG from Typst
function Build-TypstPng {
    param([string]$InputFile, [string]$OutputFile)
    
    Write-Info "Building PNG: $InputFile -> $OutputFile"
    
    try {
        # Typst can export to PNG with --format png
        typst compile "$InputFile" "$OutputFile" --root "." --format png
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Generated: $OutputFile"
            return $true
        } else {
            Write-Error "Failed to generate: $OutputFile"
            return $false
        }
    } catch {
        Write-Error "Build failed: $InputFile"
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Main build process
function Start-DocumentationBuild {
    Write-Info "Starting documentation build..."
    
    # Check Typst installation
    if (-not (Test-TypstInstalled)) {
        exit 1
    }
    
    # Create output directory
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-Success "Created output directory: $OutputDir"
    }
    
    $allSuccess = $true
    
    # Process each Typst file
    foreach ($file in $TypstFiles) {
        $inputPath = Join-Path $DocsDir $file
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file)
        
        if (-not (Test-Path $inputPath)) {
            Write-Error "File not found: $inputPath"
            $allSuccess = $false
            continue
        }
        
        # Validate syntax if requested
        if ($Validate) {
            if (-not (Test-TypstSyntax $inputPath)) {
                $allSuccess = $false
                continue
            }
        }
        
        # Build PDF
        if ($Format -eq 'pdf' -or $Format -eq 'all') {
            $pdfOutput = Join-Path $OutputDir "$baseName.pdf"
            if (-not (Build-TypstPdf $inputPath $pdfOutput)) {
                $allSuccess = $false
            }
        }
        
        # Build PNG
        if ($Format -eq 'png' -or $Format -eq 'all') {
            $pngOutput = Join-Path $OutputDir "$baseName.png"
            if (-not (Build-TypstPng $inputPath $pngOutput)) {
                $allSuccess = $false
            }
        }
    }
    
    if ($allSuccess) {
        Write-Success "Documentation build completed successfully"
        return 0
    } else {
        Write-Error "Documentation build completed with errors"
        return 1
    }
}

# Watch mode
function Start-WatchMode {
    Write-Info "Starting watch mode..."
    Write-Info "Press Ctrl+C to stop"
    
    while ($true) {
        Start-DocumentationBuild
        Start-Sleep -Seconds 2
    }
}

# Execute
if ($Watch) {
    Start-WatchMode
} else {
    $exitCode = Start-DocumentationBuild
    exit $exitCode
}
