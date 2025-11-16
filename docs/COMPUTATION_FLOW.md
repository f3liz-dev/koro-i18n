# Computation Flow Diagram

This document provides visual representations of how computation is distributed across the koro-i18n system.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                               │
│                       (Static Preprocessing)                         │
│                                                                       │
│  • Git blame extraction         • Metadata generation                │
│  • Character range mapping      • Source hash computation            │
│  • MessagePack encoding         • Pre-packing for R2                 │
│                                                                       │
│  Performance: Unlimited CPU time                                     │
│  Frequency: Once per commit                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ OIDC Token + Pre-processed Data
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TypeScript Main Worker                            │
│                  (Cloudflare Workers - Hono)                         │
│                                                                       │
│  • API routing                  • JWT authentication                 │
│  • Request validation           • Database queries (Prisma)          │
│  • Simple data mapping          • Response formatting                │
│  • Error handling               • ETag generation                    │
│                                                                       │
│  CPU Budget: <5ms per request (target)                               │
│  Fallback: For Rust worker operations                                │
└──────────┬──────────────────────────────────┬────────────────────────┘
           │                                  │
           │ Heavy CPU operations             │ Light operations
           │ (>5ms estimated)                 │ continue here
           ▼                                  │
┌─────────────────────────────────────────┐   │
│      Rust Compute Worker                │   │
│   (Cloudflare Workers - WebAssembly)    │   │
│                                         │   │
│  • Batch hash computation (6x faster)  │   │
│  • Batch validation (6x faster)        │   │
│  • R2/D1 upload (4-5x faster)          │   │
│  • Large dataset sorting (>100 items)  │   │
│                                         │   │
│  Performance: High-speed operations     │   │
│  Fallback: TypeScript implementations   │   │
└─────────────────┬───────────────────────┘   │
                  │                            │
                  │ Results                    │
                  ▼                            │
┌─────────────────────────────────────────────┴────────────────────────┐
│                    Response to Client                                 │
│                                                                        │
│  • JSON data                • MessagePack data (from R2)              │
│  • Cache headers            • ETags                                   │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             │ HTTP Response
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (SolidJS)                           │
│                     (Browser - Client-side)                          │
│                                                                       │
│  • Search filtering (<100 items)    • Priority sorting               │
│  • Status filtering                 • Client-side caching            │
│  • UI state management              • Reactive updates               │
│                                                                       │
│  Performance: <100ms for UI operations                               │
│  Limits: <1000 items in memory                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Upload Flow with Computation Distribution

```
┌────────────────┐
│  Developer     │
│  Commits Code  │
└────────┬───────┘
         │
         │ Git push
         ▼
┌────────────────────────────────────────────┐
│       GitHub Actions Workflow              │
│                                            │
│  1. Checkout repo (full history)          │
│  2. Scan for translation files            │
│  3. For each file:                         │
│     ┌─────────────────────────────────┐   │
│     │  STATIC PREPROCESSING           │   │
│     │  • git blame --line-porcelain   │   │
│     │  • Extract commit/author info   │   │
│     │  • Map keys to line numbers     │   │
│     │  • Compute SHA-256 hashes       │   │
│     │  • Encode with MessagePack      │   │
│     │  • Convert to base64            │   │
│     │  Time: ~50-100ms per file       │   │
│     └─────────────────────────────────┘   │
│  4. Prepare upload payload                 │
│  5. Acquire OIDC token (automatic)         │
└────────┬───────────────────────────────────┘
         │
         │ POST /api/projects/:name/upload
         │ Authorization: Bearer <OIDC_TOKEN>
         │ Body: {files, metadata, sourceHash}
         ▼
┌────────────────────────────────────────────┐
│     TypeScript Worker (Main)               │
│                                            │
│  1. Validate OIDC token            1-2ms  │
│  2. Validate request body          <1ms   │
│  3. Check Rust worker availability <1ms   │
│  4. Delegate to Rust worker        ──┐    │
│                                       │    │
│  Total CPU: ~2-4ms                    │    │
└───────────────────────────────────────┼────┘
                                        │
                                        │ HTTP POST /upload
                                        ▼
                        ┌───────────────────────────────┐
                        │  Rust Compute Worker          │
                        │                               │
                        │  1. Decode base64      <1ms   │
                        │  2. Store to R2        1-2ms  │
                        │     - Pre-packed data         │
                        │     - No encoding needed      │
                        │  3. Batch D1 insert    1-2ms  │
                        │     - Single SQL query        │
                        │  4. Return r2Keys      <1ms   │
                        │                               │
                        │  Total CPU: ~3-5ms            │
                        └───────────┬───────────────────┘
                                    │
                                    │ {uploaded_files, r2_keys}
                                    ▼
┌────────────────────────────────────────────┐
│     TypeScript Worker (Main)               │
│                                            │
│  5. Process invalidations (last chunk)     │
│     ┌──────────────────────────────────┐   │
│     │  If >5 translations:             │   │
│     │  → Use Rust worker batch validate│   │
│     │     Time: ~8ms for 50 items      │   │
│     │  Else:                           │   │
│     │  → Sequential TypeScript         │   │
│     │     Time: ~1ms per item          │   │
│     └──────────────────────────────────┘   │
│  6. Format response                 <1ms   │
│                                            │
│  Total CPU: ~2-3ms (excl. invalidation)    │
└────────┬───────────────────────────────────┘
         │
         │ 200 OK {success: true, ...}
         ▼
┌────────────────────────────────────────────┐
│       GitHub Actions Workflow              │
│                                            │
│  6. Log results                            │
│  7. Continue to next chunk (if any)        │
│  8. Call cleanup endpoint (if last)        │
└────────────────────────────────────────────┘
```

## Translation Display Flow

```
┌────────────────┐
│  User Opens    │
│  Editor Page   │
└────────┬───────┘
         │
         │ Navigate to /projects/:id/:lang/:file
         ▼
┌────────────────────────────────────────────┐
│          Frontend (SolidJS)                │
│                                            │
│  1. Load project metadata from cache       │
│  2. Request file metadata                  │
│  3. Request R2 file contents               │
│  4. Request web translations               │
└────────┬───────────────────────────────────┘
         │
         │ Multiple parallel requests
         ▼
┌────────────────────────────────────────────┐
│     TypeScript Worker (Main)               │
│                                            │
│  • GET /api/projects/:id/files             │
│    → Query D1 for metadata        1-2ms    │
│    → Generate ETag                <1ms     │
│    → Return JSON                  <1ms     │
│                                            │
│  • GET /api/r2/:project/:lang/:file        │
│    → Get R2 object                1-2ms    │
│    → Decode MessagePack           <1ms     │
│    → Return with cache headers    <1ms     │
│                                            │
│  • GET /api/translations                   │
│    → Query D1 for web trans       1-2ms    │
│    → Generate ETag                <1ms     │
│    → Return JSON                  <1ms     │
└────────┬───────────────────────────────────┘
         │
         │ Response data
         ▼
┌────────────────────────────────────────────┐
│          Frontend (SolidJS)                │
│                                            │
│  CLIENT-SIDE PROCESSING:                   │
│  ┌──────────────────────────────────────┐  │
│  │ 1. Merge source + target + web       │  │
│  │    Time: ~5-10ms for 100 keys        │  │
│  │                                      │  │
│  │ 2. Filter by search query            │  │
│  │    Time: O(n), ~1-2ms for 100 keys   │  │
│  │                                      │  │
│  │ 3. Filter by status (valid/invalid)  │  │
│  │    Time: O(n), ~1ms for 100 keys     │  │
│  │                                      │  │
│  │ 4. Priority sort:                    │  │
│  │    • Empty keys first                │  │
│  │    • Outdated keys second            │  │
│  │    • Valid keys alphabetically       │  │
│  │    Time: O(n log n), ~2-3ms          │  │
│  │                                      │  │
│  │ Total: ~10-15ms for typical file     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  5. Render UI with results                 │
│  6. Cache results for instant updates      │
└────────────────────────────────────────────┘
```

## Decision Matrix

### Should this computation be in GitHub Actions?

```
┌─────────────────────────────────────┐
│ Can it be computed once and cached? │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │ YES             │ NO
    ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│   GitHub    │   │ Must be dynamic  │
│   Actions   │   │ (see below)      │
└─────────────┘   └──────────────────┘

Examples:                Examples:
• Git blame             • User translations
• Source hashes         • Search results
• Metadata              • Real-time stats
• File structure        • User preferences
```

### Should dynamic computation be in Rust Worker?

```
┌─────────────────────────────────────┐
│ Will it take >5ms in TypeScript?    │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │ YES             │ NO
    ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│    Rust     │   │   TypeScript     │
│   Worker    │   │     Worker       │
└─────────────┘   └──────────────────┘

Examples:                Examples:
• Batch hashing         • JWT validation
• Batch validation      • Single DB query
• Large sorting         • Simple mapping
• File uploads          • ETag generation
```

### Should computation be in Frontend?

```
┌─────────────────────────────────────┐
│ Does it improve UX to be instant?   │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │ YES             │ NO
    ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│  Frontend   │   │     Backend      │
└──────┬──────┘   └──────────────────┘
       │
       │ AND
       ▼
┌─────────────────────────────────────┐
│ Is dataset <100 items?              │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │ YES             │ NO
    ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│  Frontend   │   │  Use pagination  │
│             │   │  or Rust worker  │
└─────────────┘   └──────────────────┘

Examples:                Examples:
• Search filter         • Full file list (1000s)
• Status filter         • Complex calculations
• Priority sort         • Heavy algorithms
• UI state             • Multi-step processing
```

## Performance Budget

```
Component          | Target  | Limit   | Rationale
-------------------|---------|---------|---------------------------
GitHub Actions     | Any     | 6 hours | Generous limits
TypeScript Worker  | <5ms    | 10ms    | Free tier limit
Rust Worker        | Any     | 30ms    | More generous paid tier
Frontend           | <100ms  | 1s      | User perception threshold
```

## Monitoring Recommendations

### Key Metrics

```
1. TypeScript Worker CPU Time
   ├─ Target: <5ms average
   ├─ Warning: >7ms sustained
   └─ Critical: >9ms sustained

2. Rust Worker Usage Rate
   ├─ Target: >90% when configured
   ├─ Warning: <80%
   └─ Critical: <50%

3. Rust Worker Fallback Rate
   ├─ Target: <5%
   ├─ Warning: >10%
   └─ Critical: >20%

4. Frontend Operation Time
   ├─ Target: <50ms for UI operations
   ├─ Warning: >100ms
   └─ Critical: >200ms
```

### Alert Triggers

```
⚠️  TypeScript Worker: CPU time consistently >7ms
    → Action: Review operations, move to Rust worker

⚠️  Rust Worker: Success rate <90%
    → Action: Check Rust worker health, review logs

⚠️  Rust Worker: Not configured
    → Action: Deploy Rust worker for better performance

⚠️  Frontend: Operations >100ms
    → Action: Implement pagination or move to backend
```

## References

- [Computation Strategy](./COMPUTATION_STRATEGY.md) - Detailed strategy document
- [Rust Worker Documentation](./RUST_WORKER.md) - Rust worker setup and usage
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Technical Flows](./FLOWS.md) - Detailed flow documentation
