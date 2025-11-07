# Mathematical Documentation System - Quick Reference

## Installation

```bash
# Windows
winget install --id Typst.Typst

# macOS
brew install typst

# Linux
wget https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz
tar -xf typst-x86_64-unknown-linux-musl.tar.xz
sudo mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/
```

## Common Commands

```bash
# Build all documentation
npm run docs:build

# Build PDF only
npm run docs:build:pdf

# Build PNG only
npm run docs:build:png

# Validate documentation
npm run docs:validate

# Watch mode (auto-rebuild)
npm run docs:watch

# Test documentation system
pwsh scripts/test-docs-system.ps1
```

## File Locations

| File | Purpose |
|------|---------|
| `docs/architecture/system-overview.typ` | System architecture and flows |
| `docs/architecture/data-models.typ` | Mathematical type definitions |
| `docs/generated/*.pdf` | Generated PDF outputs |
| `docs/generated/*.png` | Generated PNG outputs |
| `scripts/build-docs.ps1` | Windows build script |
| `scripts/build-docs.sh` | Linux/macOS build script |
| `scripts/validate-docs.ps1` | Validation script |
| `.github/workflows/docs-validation.yml` | CI/CD workflow |

## Typst Syntax Cheat Sheet

### Headings
```typst
= Level 1
== Level 2
=== Level 3
```

### Math Mode
```typst
$ f(x) = x^2 $
$ forall x in RR: f(x) gt.eq 0 $
```

### Diagrams
```typst
#import "@preview/fletcher:0.5.1" as fletcher: diagram, node, edge

#diagram(
  node((0, 0), [Node A], name: <a>),
  node((1, 0), [Node B], name: <b>),
  edge(<a>, <b>, "->", [Label])
)
```

### Tables
```typst
#table(
  columns: 2,
  [*Header 1*], [*Header 2*],
  [Value 1], [Value 2]
)
```

### Type Definitions
```typst
$ "TypeName" = { $
$  quad "field1": "Type1", $
$  quad "field2": "Type2" $
$ } $
```

## Common Symbols

| Symbol | Typst | Meaning |
|--------|-------|---------|
| → | `arrow.r` | Right arrow |
| ← | `arrow.l` | Left arrow |
| ↔ | `arrow.l.r` | Bidirectional arrow |
| ⇒ | `arrow.r.double` | Implies |
| ≤ | `lt.eq` | Less than or equal |
| ≥ | `gt.eq` | Greater than or equal |
| ∈ | `in` | Element of |
| ∉ | `in.not` | Not element of |
| ∀ | `forall` | For all |
| ∃ | `exists` | There exists |
| ∪ | `union` | Union |
| ∩ | `sect` | Intersection |
| ≡ | `equiv` | Equivalent |
| ≈ | `approx` | Approximately |

## Update Workflow

1. Edit `.typ` files
2. Run `npm run docs:validate`
3. Run `npm run docs:build`
4. Review `docs/generated/*.pdf`
5. Update version info
6. Commit changes

## Validation Checks

- ✓ Typst syntax
- ✓ Required files
- ✓ Version information
- ✓ Mathematical notation
- ✓ Cross-references
- ✓ Diagram presence

## CI/CD

- Runs on push/PR to main/develop
- Validates on Ubuntu, Windows, macOS
- Uploads artifacts (30-day retention)
- Checks for staleness (>90 days)

## Troubleshooting

### Syntax Error
```bash
npm run docs:validate
# Review error message and fix
```

### Build Failure
```bash
typst compile docs/architecture/system-overview.typ --root .
# Check detailed error output
```

### Missing Typst
```bash
typst --version
# If not found, install Typst
```

## Resources

- [Full Documentation Guide](../DOCUMENTATION_GUIDE.md)
- [Architecture README](./README.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Typst Documentation](https://typst.app/docs/)
- [Fletcher Package](https://github.com/Jollywatt/typst-fletcher)

## Support

For issues or questions:
1. Check [DOCUMENTATION_GUIDE.md](../DOCUMENTATION_GUIDE.md)
2. Review [README.md](./README.md)
3. Run test: `pwsh scripts/test-docs-system.ps1`
4. Contact development team
