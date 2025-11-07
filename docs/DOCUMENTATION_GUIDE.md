# Documentation Maintenance Guide

This guide explains how to maintain the mathematical documentation system and keep it synchronized with code changes.

## Overview

The I18n Platform uses a mathematical documentation system based on Typst to maintain precise, version-controlled technical documentation. This approach ensures that system architecture and data models are documented with mathematical rigor and can be automatically validated.

## When to Update Documentation

Documentation should be updated whenever:

1. **Architecture Changes**: New components, services, or deployment models
2. **Data Model Changes**: New types, fields, or relationships
3. **Flow Changes**: Modified authentication, translation, or plugin flows
4. **Performance Requirements**: Updated constraints or guarantees
5. **Security Model**: New security layers or mechanisms

## Documentation Files

### docs/architecture/system-overview.typ

Update this file when:
- Adding/removing system components
- Changing deployment architecture
- Modifying authentication or translation flows
- Updating plugin architecture
- Changing performance requirements
- Modifying security model

### docs/architecture/data-models.typ

Update this file when:
- Adding/removing data models
- Changing type definitions
- Modifying field types or constraints
- Adding/removing state machines
- Updating validation rules
- Changing algebraic properties

## Update Process

### 1. Identify Changes

Before making code changes, identify which documentation sections will be affected:

```bash
# Review current documentation
npm run docs:build
# Open docs/generated/*.pdf to review current state
```

### 2. Update Documentation

Edit the relevant `.typ` files in `docs/architecture/`:

```typst
# Example: Adding a new component

== New Component

#diagram(
  node((0, 0), [New Component], name: <new>),
  node((1, 0), [Existing Component], name: <existing>),
  edge(<new>, <existing>, "->", [Interaction])
)
```

### 3. Validate Changes

Run validation to check syntax:

```bash
npm run docs:validate
```

Fix any syntax errors reported by the validator.

### 4. Build Documentation

Generate updated PDFs and PNGs:

```bash
npm run docs:build
```

Review the generated files in `docs/generated/` to ensure diagrams and formatting are correct.

### 5. Update Version Information

Update the version table at the end of each modified document:

```typst
#table(
  columns: 2,
  [*Field*], [*Value*],
  [Document Version], [1.1.0],  // Increment version
  [Last Updated], [2025-11-08],  // Update date
  [Platform Version], [1.0.0],
)
```

### 6. Commit Changes

Commit both code and documentation changes together:

```bash
git add docs/architecture/*.typ
git add src/...  # Your code changes
git commit -m "feat: Add new component with documentation"
```

## Common Update Scenarios

### Adding a New API Endpoint

1. Update `system-overview.typ`:
   - Add endpoint to API Gateway section
   - Update relevant flow diagrams

2. Update `data-models.typ` if new types are introduced:
   - Add type definitions
   - Add validation rules

3. Example:
```typst
// In system-overview.typ
app.post('/api/new-endpoint', authMiddleware, controller.newEndpoint)

// In data-models.typ
$ "NewType" = { $
$  quad "field1": "String", $
$  quad "field2": "Integer" $
$ } $
```

### Modifying Data Models

1. Update type definition in `data-models.typ`:
```typst
$ "User" = { $
$  quad "id": "String", $
$  quad "githubId": "Integer", $
$  quad "username": "String", $
$  quad "email": "String", $
$  quad "newField": "String"  // Added field $
$ } $
```

2. Update invariants if necessary:
```typst
$ forall u in "User": $
$ quad |u."newField"| > 0  // New invariant $
```

### Changing Architecture

1. Update architecture diagram in `system-overview.typ`:
```typst
#diagram(
  node((0, 0), [Client], name: <client>),
  node((0, 1), [New Layer], name: <new>),  // Added layer
  node((0, 2), [API Gateway], name: <gateway>),
  
  edge(<client>, <new>, "->", [Request]),
  edge(<new>, <gateway>, "->", [Route])
)
```

2. Add description of new component
3. Update deployment sections if affected

### Updating Performance Requirements

1. Update performance constraints in `system-overview.typ`:
```typst
== Performance Requirements

- *Response Time*: $t_"response" lt.eq 150 "ms"$ (updated from 200ms)
- *Load Time*: $t_"load" lt.eq 2 "s"$
- *Commit Time*: $t_"commit" lt.eq 60 "s"$
```

2. Update resource bounds in `data-models.typ` if applicable

## CI/CD Integration

The documentation system is integrated with CI/CD:

### Automatic Validation

On every push and pull request:
- Syntax validation runs automatically
- Build process verifies all documents compile
- Cross-references are checked
- Version information is validated

### Viewing CI/CD Results

1. Check GitHub Actions for validation status
2. Download generated documentation artifacts
3. Review any warnings or errors

### Handling CI/CD Failures

If documentation validation fails:

1. Review the error message in CI/CD logs
2. Fix syntax errors locally
3. Run `npm run docs:validate` to verify fix
4. Push corrected documentation

## Best Practices

### 1. Update Documentation First

Consider updating documentation before implementing features:
- Clarifies design decisions
- Provides implementation reference
- Ensures documentation accuracy

### 2. Use Mathematical Precision

Leverage mathematical notation for specifications:
```typst
// Good: Precise specification
$ forall t in "Translation": t."status" in {"draft", "submitted", "committed", "failed"} $

// Avoid: Vague description
"Translation status can be draft, submitted, committed, or failed"
```

### 3. Include Visual Diagrams

Add diagrams for complex interactions:
```typst
#diagram(
  node-stroke: 1pt,
  edge-stroke: 1pt,
  node((0, 0), [Component A], name: <a>),
  node((1, 0), [Component B], name: <b>),
  edge(<a>, <b>, "->", [Data Flow])
)
```

### 4. Maintain Consistency

- Follow existing notation patterns
- Use consistent naming conventions
- Match code terminology exactly

### 5. Version Everything

- Increment document version on changes
- Update last modified date
- Reference platform version

### 6. Review Generated Output

Always review PDFs/PNGs after building:
```bash
npm run docs:build
# Open docs/generated/*.pdf
```

## Troubleshooting

### Documentation Out of Sync

If documentation doesn't match code:

1. Identify discrepancies
2. Update documentation to match current implementation
3. Add note about when change occurred
4. Consider adding migration guide if breaking change

### Complex Diagrams

For complex diagrams:

1. Break into multiple smaller diagrams
2. Use hierarchical organization
3. Add detailed captions
4. Reference from multiple sections

### Mathematical Notation

For complex mathematical expressions:

1. Add comments explaining notation
2. Define custom symbols in glossary
3. Use standard mathematical conventions
4. Reference external resources if needed

## Resources

- [Typst Documentation](https://typst.app/docs/)
- [Fletcher Diagram Package](https://github.com/Jollywatt/typst-fletcher)
- [Mathematical Notation Guide](https://typst.app/docs/reference/math/)
- [Architecture Documentation README](./architecture/README.md)

## Getting Help

If you need help with documentation:

1. Review existing documentation files for examples
2. Check Typst documentation for syntax
3. Run validation to identify specific issues
4. Ask team members for review

## Checklist

Before committing documentation changes:

- [ ] All affected `.typ` files updated
- [ ] Syntax validation passes (`npm run docs:validate`)
- [ ] Documentation builds successfully (`npm run docs:build`)
- [ ] Generated PDFs reviewed for correctness
- [ ] Version information updated
- [ ] Cross-references are valid
- [ ] Diagrams render correctly
- [ ] Mathematical notation is precise
- [ ] Changes match code implementation
- [ ] CI/CD validation will pass

## Maintenance Schedule

Regular documentation maintenance:

- **Weekly**: Review for outdated sections
- **Monthly**: Update version information
- **Quarterly**: Comprehensive review and refactoring
- **On Release**: Ensure all changes documented

## Contact

For questions about the documentation system, contact the development team or open an issue in the project repository.
