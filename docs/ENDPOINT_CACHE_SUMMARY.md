# API Endpoint Cache Summary

Quick reference guide for caching strategy across all endpoints.

## 🟢 Cacheable Endpoints (Long TTL)

### Projects (5 minutes)
```
GET /api/projects                      → 5 min cache, 1 min SWR
GET /api/projects/all                  → 5 min cache, 1 min SWR
GET /api/projects/:id/members          → 5 min cache, 1 min SWR
```

### Project Files (10 minutes)
```
GET /api/projects/:projectName/download        → 10 min cache, 2 min SWR
GET /api/projects/:projectId/files             → 10 min cache, 2 min SWR
GET /api/projects/:projectId/files/summary     → 10 min cache, 2 min SWR
```

---

## 🟡 Short-Cache Endpoints (1 minute)

### Translations
```
GET /api/translations          → 1 min cache, 30 sec SWR
GET /api/translations/history  → 1 min cache, 30 sec SWR
```

---

## 🔴 Real-Time Endpoints (No Cache)

### Authentication & Authorization
```
GET /api/auth/me               → NO CACHE (security)
GET /api/auth/github           → NO CACHE (redirect)
GET /api/auth/callback         → NO CACHE (one-time)
```

### Real-Time Data
```
GET /api/translations/suggestions  → NO CACHE (collaborative editing)
GET /api/logs/history             → NO CACHE (real-time logs)
GET /api/prisma/users             → NO CACHE (debug)
```

---

## 🟦 Static Endpoints (24 hours)

### System
```
GET /health  → 24 hour cache
```

---

## ⚫ Mutation Endpoints (No Cache Headers)

### Projects
```
POST   /api/projects                              → mutation
DELETE /api/projects/:id                          → mutation
PATCH  /api/projects/:id                          → mutation
POST   /api/projects/:id/join                     → mutation
POST   /api/projects/:id/members/:memberId/approve → mutation
DELETE /api/projects/:id/members/:memberId        → mutation
```

### Files
```
POST /api/projects/:projectName/upload        → mutation
POST /api/projects/:projectName/upload-json   → mutation
```

### Translations
```
POST   /api/translations          → mutation
POST   /api/translations/:id/approve → mutation
DELETE /api/translations/:id      → mutation
```

### Auth
```
POST /api/auth/logout  → mutation
```

---

## Cache Strategy by Type

| Data Type | Max Age | SWR | Rationale |
|-----------|---------|-----|-----------|
| **Projects** | 5 min | 1 min | Changes only when creating/deleting projects |
| **Project Files** | 10 min | 2 min | Stable between uploads |
| **Translations** | 1 min | 30 sec | Changes during active editing |
| **Auth Status** | 0 | - | Must always be current for security |
| **Suggestions** | 0 | - | Real-time collaborative data |
| **Logs** | 0 | - | Real-time audit trail |
| **Health** | 24 hr | - | Static system status |

---

## Frontend Integration

### Dual-Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐         ┌─────────────────────┐     │
│  │   SolidJS Store   │◄────────┤   API Requests      │     │
│  │  (In-Memory)      │         │  (authFetch)        │     │
│  └───────────────────┘         └─────────────────────┘     │
│         ▲                                 │                  │
│         │ Instant Updates                 │                  │
│         │                                 ▼                  │
│  ┌──────┴────────────────────────────────────────┐         │
│  │        Browser HTTP Cache                      │         │
│  │     (Cache-Control headers)                   │         │
│  └───────────────────────────────────────────────┘         │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │  API Server   │
                │  (Workers)    │
                └───────────────┘
```

**Benefits:**
- ✅ Instant UI updates (SolidJS Store)
- ✅ Reduced network requests (HTTP Cache)
- ✅ Optimistic rendering
- ✅ Background updates

---

## Security Considerations

All cache headers include `private` directive:
```
Cache-Control: max-age=300, stale-while-revalidate=60, private
```

This ensures:
- ✅ No CDN caching of user-specific data
- ✅ Each user gets isolated cache
- ✅ No cross-user data leakage
- ✅ Authentication always checked (no-cache on /api/auth/me)

---

## Testing Cache Behavior

### Browser DevTools
1. Open Network tab
2. Check "Cache-Control" in response headers
3. Look for "(from disk cache)" or "(from memory cache)"
4. Disable cache to test fresh requests

### Automated Tests
```bash
pnpm test                # Run all tests
pnpm type-check          # Type checking
pnpm build              # Build verification
```

---

## Quick Decision Tree

```
Is this a GET request?
├─ NO  → Don't add cache headers (mutation)
└─ YES → Continue...
    │
    Does it show user-specific real-time data?
    ├─ YES (auth, suggestions, logs) → Use noCache (maxAge: 0)
    └─ NO  → Continue...
        │
        Does it change frequently during editing?
        ├─ YES (translations) → Use short cache (1 min)
        └─ NO  → Continue...
            │
            Is it stable between operations?
            ├─ YES (projects, files) → Use longer cache (5-10 min)
            └─ NO (system/static) → Use static cache (24 hr)
```

---

## Performance Impact

**Before this PR:**
- ✅ 15 endpoints had cache headers
- ⚠️ 5 endpoints missing cache headers
- ❌ No comprehensive documentation

**After this PR:**
- ✅ 20 endpoints have cache headers
- ✅ All endpoints properly classified
- ✅ Comprehensive documentation
- ✅ Clear rationale for each decision

**Expected improvements:**
- 📉 Reduced network requests (~30-50%)
- ⚡ Faster page loads (cached data)
- 💰 Lower server costs (fewer DB queries)
- 😊 Better UX (instant responses)

---

For detailed information, see [API_CACHING_STRATEGY.md](../API_CACHING_STRATEGY.md)
