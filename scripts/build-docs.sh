#!/bin/bash
# Build script for mathematical documentation
# Generates PDF and PNG outputs from Typst source files

set -e

# Configuration
DOCS_DIR="docs/architecture"
OUTPUT_DIR="docs/generated"
TYPST_FILES=(
    "system-overview.typ"
    "data-models.typ"
)

# Default parameters
FORMAT="all"
WATCH=false
VALIDATE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Typst is installed
check_typst_installed() {
    if command -v typst &> /dev/null; then
        local version=$(typst --version)
        print_success "Typst is installed: $version"
        return 0
    else
        print_error "Typst is not installed"
        print_info "Install Typst from: https://github.com/typst/typst/releases"
        print_info "Or use your package manager (e.g., brew install typst)"
        return 1
    fi
}

# Validate Typst syntax
validate_typst_syntax() {
    local file_path=$1
    print_info "Validating syntax: $file_path"
    
    if typst compile "$file_path" --root "." > /dev/null 2>&1; then
        print_success "Syntax valid: $file_path"
        return 0
    else
        print_error "Syntax error in: $file_path"
        typst compile "$file_path" --root "." 2>&1
        return 1
    fi
}

# Build PDF from Typst
build_typst_pdf() {
    local input_file=$1
    local output_file=$2
    
    print_info "Building PDF: $input_file -> $output_file"
    
    if typst compile "$input_file" "$output_file" --root "."; then
        print_success "Generated: $output_file"
        return 0
    else
        print_error "Failed to generate: $output_file"
        return 1
    fi
}

# Build PNG from Typst
build_typst_png() {
    local input_file=$1
    local output_file=$2
    
    print_info "Building PNG: $input_file -> $output_file"
    
    if typst compile "$input_file" "$output_file" --root "." --format png; then
        print_success "Generated: $output_file"
        return 0
    else
        print_error "Failed to generate: $output_file"
        return 1
    fi
}

# Main build process
build_documentation() {
    print_info "Starting documentation build..."
    
    # Check Typst installation
    if ! check_typst_installed; then
        exit 1
    fi
    
    # Create output directory
    if [ ! -d "$OUTPUT_DIR" ]; then
        mkdir -p "$OUTPUT_DIR"
        print_success "Created output directory: $OUTPUT_DIR"
    fi
    
    local all_success=true
    
    # Process each Typst file
    for file in "${TYPST_FILES[@]}"; do
        local input_path="$DOCS_DIR/$file"
        local base_name="${file%.typ}"
        
        if [ ! -f "$input_path" ]; then
            print_error "File not found: $input_path"
            all_success=false
            continue
        fi
        
        # Validate syntax if requested
        if [ "$VALIDATE" = true ]; then
            if ! validate_typst_syntax "$input_path"; then
                all_success=false
                continue
            fi
        fi
        
        # Build PDF
        if [ "$FORMAT" = "pdf" ] || [ "$FORMAT" = "all" ]; then
            local pdf_output="$OUTPUT_DIR/$base_name.pdf"
            if ! build_typst_pdf "$input_path" "$pdf_output"; then
                all_success=false
            fi
        fi
        
        # Build PNG
        if [ "$FORMAT" = "png" ] || [ "$FORMAT" = "all" ]; then
            local png_output="$OUTPUT_DIR/$base_name.png"
            if ! build_typst_png "$input_path" "$png_output"; then
                all_success=false
            fi
        fi
    done
    
    if [ "$all_success" = true ]; then
        print_success "Documentation build completed successfully"
        return 0
    else
        print_error "Documentation build completed with errors"
        return 1
    fi
}

# Watch mode
watch_mode() {
    print_info "Starting watch mode..."
    print_info "Press Ctrl+C to stop"
    
    while true; do
        build_documentation
        sleep 2
    done
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute
if [ "$WATCH" = true ]; then
    watch_mode
else
    build_documentation
    exit $?
fi
