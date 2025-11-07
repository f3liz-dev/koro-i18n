# Mathematical Documentation System

This directory contains the mathematical documentation for the I18n Platform, maintained in Typst format for precision, version control, and automated diagram generation.

## Overview

The documentation system uses [Typst](https://typst.app/), a modern markup-based typesetting system that combines the power of LaTeX with a more intuitive syntax. This approach ensures:

- **Precision**: Mathematical notation for exact technical specifications
- **Version Control**: Plain text format suitable for Git
- **Automation**: Automated diagram generation during build process
- **Validation**: Syntax checking in CI/CD pipeline

## Requirements

### Typst Installation

**Windows:**
```powershell
winget install --id Typst.Typst
```

**macOS:**
```bash
brew install typst
```

**Linux:**
```bash
# Download latest release
wget https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz
tar -xf typst-x86_64-unknown-linux-musl.tar.xz
sudo mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/
```

Verify installation:
```bash
typst --version
```

## Documentation Files

### system-overview.typ
Comprehensive system architecture documentation including:
- High-level architecture diagrams
- Deployment models (Cloudflare Workers and Node.js)
- Authentication and translation flows
- Plugin architecture
- Performance requirements
- Security model

### data-models.typ
Mathematical definitions of core data models:
- Type system notation
- Domain models (User, Project, Translation, Plugin)
- Type invariants and constraints
- State machines
- Validation rules
- Algebraic properties

## Building Documentation

### Using npm Scripts

```bash
# Build all formats (PDF and PNG)
npm run docs:build

# Build only PDF
npm run docs:build:pdf

# Build only PNG
npm run docs:build:png

# Validate documentation syntax
npm run docs:validate

# Watch mode (rebuild on changes)
npm run docs:watch
```

### Using Build Scripts Directly

**Windows (PowerShell):**
```powershell
# Build all formats
pwsh scripts/build-docs.ps1

# Build specific format
pwsh scripts/build-docs.ps1 -Format pdf
pwsh scripts/build-docs.ps1 -Format png

# Validate syntax
pwsh scripts/build-docs.ps1 -Validate

# Watch mode
pwsh scripts/build-docs.ps1 -Watch
```

**Linux/macOS (Bash):**
```bash
# Build all formats
bash scripts/build-docs.sh

# Build specific format
bash scripts/build-docs.sh --format pdf
bash scripts/build-docs.sh --format png

# Validate syntax
bash scripts/build-docs.sh --validate

# Watch mode
bash scripts/build-docs.sh --watch
```

## Validation

The documentation system includes comprehensive validation:

```bash
# Run validation checks
npm run docs:validate

# Or directly
pwsh scripts/validate-docs.ps1
```

Validation checks include:
- Typst syntax validation
- Required files presence
- Version information completeness
- Mathematical notation consistency
- Cross-reference validation
- Diagram presence

## CI/CD Integration

Documentation is automatically validated in CI/CD pipeline:

- **On Push/PR**: Validates syntax and builds documentation
- **Artifact Upload**: Generated PDFs and PNGs uploaded as artifacts
- **Multi-Platform**: Tests on Ubuntu, Windows, and macOS
- **Staleness Check**: Warns if documentation is >90 days old

See `.github/workflows/docs-validation.yml` for details.

## Output

Generated documentation is placed in `docs/generated/`:

```
docs/generated/
├── system-overview.pdf
├── system-overview.png
├── data-models.pdf
└── data-models.png
```

**Note**: The `docs/generated/` directory is git-ignored. Generated files are created during build and available as CI/CD artifacts.

## Writing Documentation

### Typst Syntax Basics

**Headings:**
```typst
= Level 1 Heading
== Level 2 Heading
=== Level 3 Heading
```

**Mathematical Notation:**
```typst
$ f(x) = x^2 + 2x + 1 $
$ forall x in RR: f(x) gt.eq 0 $
```

**Diagrams (using Fletcher):**
```typst
#import "@preview/fletcher:0.5.1" as fletcher: diagram, node, edge

#diagram(
  node((0, 0), [Component A], name: <a>),
  node((1, 0), [Component B], name: <b>),
  edge(<a>, <b>, "->", [Connection])
)
```

**Tables:**
```typst
#table(
  columns: 2,
  [*Header 1*], [*Header 2*],
  [Value 1], [Value 2]
)
```

### Best Practices

1. **Version Information**: Always include version table at document end
2. **Mathematical Precision**: Use mathematical notation for specifications
3. **Diagrams**: Include visual representations of architecture
4. **Cross-References**: Use named references for diagram nodes
5. **Consistency**: Follow existing notation and structure
6. **Comments**: Add comments for complex mathematical expressions

### Example Structure

```typst
= Document Title

== Overview
Brief introduction to the topic.

== Mathematical Definition

$ "Type" = { $
$  quad "field1": "Type1", $
$  quad "field2": "Type2" $
$ } $

== Diagram

#diagram(
  node((0, 0), [Node], name: <node>)
)

== Version Information

#table(
  columns: 2,
  [*Field*], [*Value*],
  [Document Version], [1.0.0],
  [Last Updated], [2025-11-08]
)
```

## Maintenance

### Updating Documentation

When system architecture changes:

1. Update relevant `.typ` files
2. Run validation: `npm run docs:validate`
3. Build documentation: `npm run docs:build`
4. Review generated PDFs/PNGs
5. Commit changes to version control

### Adding New Documents

1. Create new `.typ` file in `docs/architecture/`
2. Add to `$TypstFiles` array in build scripts
3. Add to `$RequiredFiles` array in validation script
4. Update this README with document description
5. Run validation and build

## Troubleshooting

### Typst Not Found

Ensure Typst is installed and in PATH:
```bash
typst --version
```

### Syntax Errors

Run validation to see detailed error messages:
```bash
npm run docs:validate
```

### Build Failures

Check Typst compilation output:
```bash
typst compile docs/architecture/system-overview.typ --root .
```

### Missing Diagrams

Ensure Fletcher package is available:
```typst
#import "@preview/fletcher:0.5.1" as fletcher: diagram, node, edge
```

## Resources

- [Typst Documentation](https://typst.app/docs/)
- [Typst Tutorial](https://typst.app/docs/tutorial/)
- [Fletcher Diagram Package](https://github.com/Jollywatt/typst-fletcher)
- [Typst Math Reference](https://typst.app/docs/reference/math/)

## Contributing

When contributing to documentation:

1. Follow existing structure and notation
2. Validate syntax before committing
3. Update version information
4. Test build process locally
5. Ensure CI/CD validation passes

## License

Documentation is part of the I18n Platform project and follows the same MIT license.
