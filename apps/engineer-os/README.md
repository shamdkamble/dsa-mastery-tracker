# EngineerOS — live DSA Mantra integration

Admin-only interview learning OS, **same domain** as DSA Mantra so it works from anywhere you use DSA Mantra.

## How live access works

| Piece | Behavior |
|--------|----------|
| URL | `https://<your-dsa-mantra-domain>/engineer-os/` |
| Login | Same DSA Mantra login (`dsa-auth-token` in localStorage) |
| Auth check | `GET /api/auth/me` with Bearer token → **MongoDB users** |
| Who enters | `user.role === "admin"` only |
| Progress | Local to browser (`engineeros-progress-v1`) |

Because EngineerOS is **same-origin**, your live session is shared automatically — phone, laptop, office, anywhere.

## Deploy (required for production)

From monorepo root (`D:\LeetCodeTracker`):

```bash
npm run build:engineer-os
git add engineer-os apps/engineer-os js server vercel.json package.json
git commit -m "Deploy EngineerOS under /engineer-os (admin, live auth)"
git push
```

Vercel will serve static files from `/engineer-os` on the **same deployment** as DSA Mantra. No second database. No second login.

## Local (same behavior as live)

```bash
# Terminal 1 — DSA Mantra (uses your .env MongoDB)
npm run dev

# Build EngineerOS into /engineer-os once
npm run build:engineer-os

# Open http://localhost:8080 → login as admin → Admin → EngineerOS Learning
# Or open http://localhost:8080/engineer-os/
```

## Admin entry points in DSA Mantra

1. Sidebar → **Administration → EngineerOS Learning**
2. Admin Panel → quick card **EngineerOS Learning**
3. Admin subnav → **EngineerOS**

Non-admins never see the nav item; if they open the URL they get the lock screen after live API check.
