# Nexus Forum

A modern community forum (BBS) built on Next.js App Router via **vinext** and deployed to **Cloudflare Workers** with a **D1** database.

Includes authentication, boards, threads, posts, FTS5 full-text search, notifications, moderation, an admin panel, per-user theming, and hard security defaults (CSRF protection, PBKDF2 password hashing, D1-backed rate limiting, sanitized Markdown).

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deployment

One-click deploy from the Cloudflare dashboard (connect this GitHub repo):

- **Project name:** `bbs-develop-by-agent`
- **Production branch:** `main`
- **Build command:** leave empty
- **Deploy command:** `npm run deploy`

The D1 database is created automatically on first deploy, the schema initializes on the first request, and the first registered user becomes admin. No manual configuration or secrets are required.

For full documentation (architecture, schema, security, API, configuration), see [TraeDevDoc/README.md](TraeDevDoc/README.md).
