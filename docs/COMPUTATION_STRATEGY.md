# Computation Distribution Strategy

This document outlines the strategy for distributing computational work across different components of the koro-i18n system, optimized for Cloudflare Workers' free tier (10ms CPU limit per request).

## Core Principles

1. **Static > Dynamic**: Prefer static computation in GitHub Actions over dynamic computation
2. **Rust > TypeScript**: For dynamic computation, use Rust worker over TypeScript worker
3. **Backend > Frontend**: Keep frontend light, but allow simple operations for better UX
4. **Batch > Sequential**: Always batch operations when possible

## Computation Distribution

### 1. GitHub Actions (Static Preprocessing)

**When to use**: Data that can be computed once during upload and never changes

**Operations**:
- ✅ Git blame extraction (`git blame --line-porcelain`)
- ✅ Character range mapping (line/column positions in source files)
- ✅ Source hash computation (SHA-256 of each translation value)
- ✅ Metadata encoding (MessagePack compression)
- ✅ File content flattening (nested object → flat key-value pairs)
- ✅ Pre-packing R2 data (base64-encoded MessagePack)

**Rationale**: 
- Unlimited CPU time (GitHub Actions has generous limits)
- Computed once, used many times
- Reduces Cloudflare Worker CPU usage to near zero for uploads

**Implementation**: `client-library/src/index.ts`

### 2. Rust Compute Worker (Dynamic Heavy Computation)

**When to use**: CPU-intensive operations that must be dynamic

**Operations**:
- ✅ Batch hash computation (>5 values)
- ✅ Batch translation validation (>5 translations)
- ✅ R2 file uploads and D1 database operations
- 🔄 Large dataset sorting (>100 items) - Future
- 🔄 Large dataset filtering (>100 items) - Future
- 🔄 Complex data transformations - Future

**Rationale**:
- 6-7x faster than TypeScript for hash operations
- Can handle larger CPU budgets
- Keeps main worker under 10ms limit
- Free tier has generous request limits

**Performance**:
```
Operation               | TypeScript | Rust    | Speedup
------------------------|------------|---------|--------
Hash 100 values         | 25ms      | 4ms     | 6.25x
Validate 50 translations| 50ms      | 8ms     | 6.25x
Upload + D1 batch       | 15-20ms   | 3-5ms   | 4-5x
```

**Implementation**: `rust-worker/src/lib.rs`

**API Endpoints**:
- `POST /upload` - Upload files to R2 and update D1
- `POST /hash` - Batch SHA-256 hash computation
- `POST /validate` - Batch translation validation
- `GET /health` - Health check

### 3. TypeScript Worker (Light Dynamic Operations)

**When to use**: Simple operations that don't require Rust's performance

**Operations**:
- ✅ JWT authentication and validation
- ✅ Database queries (Prisma ORM)
- ✅ Simple data mapping (<100 items)
- ✅ ETag generation (hash of timestamps)
- ✅ Response formatting
- ✅ Error handling and logging

**CPU Budget**: Target <5ms per request (leaves 5ms margin)

**Implementation**: `src/routes/*.ts`

**Fallback Strategy**:
- All Rust worker operations have TypeScript fallbacks
- If Rust worker is unavailable, TypeScript handles the load
- Graceful degradation ensures 100% uptime

### 4. Frontend (User Interface Operations)

**When to use**: Operations that benefit from client-side execution for better UX

**Operations**:
- ✅ Search filtering (<100 items)
- ✅ Status filtering (valid/invalid/all)
- ✅ Simple sorting by key name (<100 items)
- ✅ Priority sorting (empty/outdated first)
- ✅ Client-side caching
- ✅ UI state management

**Limits**:
- Keep operations O(n) or O(n log n) complexity
- Limit to <1000 items in-memory
- For larger datasets, implement pagination or request backend sorting

**Implementation**: `src/app/pages/*.tsx`, `src/app/utils/*.ts`

**Examples of Light Operations**:
```typescript
// ✅ Good: Simple filter + sort on <100 items
const filtered = translations()
  .filter(t => t.key.includes(searchQuery()))
  .sort((a, b) => a.key.localeCompare(b.key));

// ✅ Good: Priority sorting with multiple criteria
const sorted = filtered.sort((a, b) => {
  if (aEmpty && !bEmpty) return -1;
  if (aOutdated && !bOutdated) return -1;
  return a.key.localeCompare(b.key);
});

// ❌ Bad: Complex calculations on every render
const calculated = translations().map(t => ({
  ...t,
  similarity: calculateLevenshteinDistance(t.sourceValue, t.currentValue),
  wordCount: t.sourceValue.split(' ').length,
  complexity: analyzeComplexity(t.sourceValue)
}));
```

## Decision Tree

```
Need to compute something?
│
├─ Can it be static (computed once)?
│  └─ YES → Use GitHub Actions preprocessing
│  └─ NO  → Continue
│
├─ Is it CPU-intensive (>5ms)?
│  ├─ YES → Use Rust compute worker
│  │       └─ With TypeScript fallback
│  └─ NO  → Continue
│
├─ Does it require backend data/auth?
│  ├─ YES → Use TypeScript worker (keep it simple)
│  └─ NO  → Continue
│
└─ Would it improve UX to do it client-side?
   ├─ YES → Use frontend (if <1000 items)
   └─ NO  → Use TypeScript worker
```

## Current Implementation Status

### ✅ Already Optimized
- Git blame extraction (GitHub Actions)
- Metadata generation (GitHub Actions)
- Source hash computation (GitHub Actions)
- Batch validation (Rust worker with fallback)
- Batch hash computation (Rust worker with fallback)
- Frontend filtering and sorting (lightweight operations)

### 🔄 Optimization Opportunities
1. **Force Rust worker for uploads**: Currently falls back too easily
2. **Add Rust worker sorting endpoint**: For future large dataset support
3. **Add client-side caching**: For sorted/filtered results
4. **Add pagination**: For files/translations lists >100 items
5. **Move ETag calculation**: To Rust worker for large file lists (>100 files)

## Performance Monitoring

### Metrics to Track
1. **Rust worker usage rate**: Should be >90% when configured
2. **TypeScript worker CPU time**: Should stay <5ms average
3. **Frontend operation time**: Should be <100ms for UI responsiveness
4. **Upload success rate**: Should be >99%

### Warning Signs
- ⚠️ TypeScript worker CPU >8ms consistently
- ⚠️ Rust worker failing >10% of requests
- ⚠️ Frontend operations >200ms
- ⚠️ Fallback to TypeScript >20% of the time

## Future Enhancements

### Short-term (Low-hanging fruit)
1. Add Rust worker configuration check on startup
2. Add performance logging for all operations
3. Implement client-side result caching
4. Add pagination for large lists

### Medium-term (Significant improvements)
1. Add Rust worker sorting/filtering endpoints
2. Implement WebSocket for real-time updates
3. Add service worker for offline support
4. Implement lazy loading for translation lists

### Long-term (Architecture changes)
1. Consider edge caching (Cloudflare Cache API)
2. Evaluate Durable Objects for real-time collaboration
3. Consider Workers Analytics for monitoring
4. Evaluate moving more operations to Rust

## Best Practices

### For Backend Developers
1. Always check CPU time in logs
2. Batch operations whenever possible
3. Use Rust worker for CPU-intensive tasks
4. Keep TypeScript operations simple
5. Always provide fallbacks

### For Frontend Developers
1. Keep operations under 100ms
2. Use memoization for expensive calculations
3. Implement pagination for large lists
4. Use client-side caching
5. Request backend sorting for >100 items

### For DevOps
1. Monitor Rust worker availability
2. Set up alerts for CPU time >8ms
3. Monitor fallback usage rates
4. Track request success rates
5. Monitor free tier usage limits

## References

- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Rust Worker Documentation](./RUST_WORKER.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Technical Flows](./FLOWS.md)
