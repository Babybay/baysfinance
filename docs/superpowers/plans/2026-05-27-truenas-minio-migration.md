# TrueNAS + MinIO Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cloudflare R2 with MinIO on TrueNAS as object storage, add Docker Compose for self-hosted TrueNAS deployment, and produce a step-by-step TrueNAS deployment guide.

**Architecture:** Next.js app deployed to Vercel (prod) or Docker on TrueNAS (self-hosted). MinIO on TrueNAS is the S3-compatible object storage for both environments — accessed via Cloudflare Tunnel from Vercel, or via Docker internal network from the self-hosted container. Cloud PostgreSQL (Neon/Supabase) remains the database in both environments.

**Tech Stack:** Next.js 16 (standalone output) · AWS S3 SDK (`@aws-sdk/client-s3`) · MinIO (`minio/minio:latest`) · Docker Compose v2 · Cloudflare Tunnel (`cloudflared`) · node:20-alpine

---

## Files Changed

| File | Action |
|---|---|
| `src/lib/s3.ts` | Modify — rename R2_* env vars to MINIO_*, fix region |
| `src/app/api/upload/route.ts` | Modify — update log messages |
| `src/app/api/documents/presigned/route.ts` | Modify — update env var reference |
| `next.config.mjs` | Modify — replace hardcoded R2 hostname, use MINIO_HOSTNAME env var |
| `.env.example` | Create — template for all env vars |
| `Dockerfile` | Create — Next.js multi-stage production build |
| `.dockerignore` | Create |
| `docker-compose.yml` | Modify — add MinIO and app services |
| `docker-compose.dev.yml` | Create — local dev overrides (postgres + minio) |
| `CLAUDE.md` | Modify — update env vars, add Docker and Deployment sections |
| `docs/deployment/truenas.md` | Create — TrueNAS deployment guide |
| `docs/architecture/truenas.md` | Create — moved from `accounting_crm_truenas_architecture.md` |
| `accounting_crm_truenas_architecture.md` | Delete — replaced by docs/architecture/truenas.md |

---

## Task 1: Migrate `src/lib/s3.ts`

**Files:**
- Modify: `src/lib/s3.ts`

- [ ] **Step 1: Replace the file content**

Replace the full contents of `src/lib/s3.ts` with:

```typescript
import { S3Client } from "@aws-sdk/client-s3";

const MINIO_REQUIRED_VARS = ["MINIO_ACCESS_KEY_ID", "MINIO_SECRET_ACCESS_KEY", "MINIO_ENDPOINT", "MINIO_BUCKET_NAME"] as const;

if (process.env.NODE_ENV === "production") {
    const missing = MINIO_REQUIRED_VARS.filter((v) => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required MinIO environment variables: ${missing.join(", ")}`);
    }
} else if (!process.env.MINIO_ACCESS_KEY_ID || !process.env.MINIO_SECRET_ACCESS_KEY || !process.env.MINIO_ENDPOINT) {
    console.warn("[s3] MinIO environment variables are missing. File uploads will fail.");
}

export const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY || "",
    },
});

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "";
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "D:/THE PROJECT/saas-consulting" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `s3.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/s3.ts
git commit -m "feat: migrate storage client from Cloudflare R2 to MinIO"
```

---

## Task 2: Update upload route log messages

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Update the two log messages that reference R2**

In `src/app/api/upload/route.ts`:

Change line 14:
```typescript
console.log(`Starting upload to R2 bucket: "${BUCKET_NAME}"`);
```
→
```typescript
console.log(`Starting upload to MinIO bucket: "${BUCKET_NAME}"`);
```

Change line 49 (inside the catch block):
```typescript
console.error("R2 Upload Route Error:", error);
```
→
```typescript
console.error("MinIO Upload Route Error:", error);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "D:/THE PROJECT/saas-consulting" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "chore: update upload route log messages for MinIO"
```

---

## Task 3: Update presigned URL route

**Files:**
- Modify: `src/app/api/documents/presigned/route.ts`

- [ ] **Step 1: Update the PUBLIC_URL env var reference**

In `src/app/api/documents/presigned/route.ts`, change line 6:
```typescript
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
```
→
```typescript
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "";
```

Also update the JSDoc comment above `extractKey` (lines 14–16) — replace all mentions of "R2" with "MinIO":
```typescript
/**
 * Extract the MinIO object key from either a full URL or a raw key.
 *
 * Handles:
 *   - Full URL: "https://s3.yourdomain.com/bucket/path/to/file.pdf"
 *   - Public URL: "https://s3.yourdomain.com/path/to/file.pdf"
 *   - Raw key: "uploads/1234-file.pdf"
 */
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "D:/THE PROJECT/saas-consulting" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documents/presigned/route.ts
git commit -m "chore: update presigned URL route for MinIO"
```

---

## Task 4: Update `next.config.mjs`

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Replace the full file content**

The current file has a hardcoded R2 hostname in `images.remotePatterns`. Replace with an env-var-driven pattern so any MinIO hostname works without code changes per deployment:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: process.env.MINIO_HOSTNAME
      ? [{ protocol: /** @type {'https'} */ ('https'), hostname: process.env.MINIO_HOSTNAME }]
      : [],
  },
  output: 'standalone',
  serverExternalPackages: ['tesseract.js', 'pdf-parse'],
};

export default nextConfig;
```

`MINIO_HOSTNAME` should be set to `s3.yourdomain.com` in Vercel env vars and in `.env.production` on TrueNAS. Leave it empty for local dev (next/image won't load from MinIO in dev, but that's fine — presigned URLs work without it).

- [ ] **Step 2: Verify build does not break**

```bash
cd "D:/THE PROJECT/saas-consulting" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "chore: replace hardcoded R2 hostname with MINIO_HOSTNAME env var"
```

---

## Task 5: Create `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create the file**

Create `.env.example` in the project root with this exact content:

```env
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database (Neon / Supabase / local)
DATABASE_URL=

# MinIO / Object Storage
# Production (Vercel):   MINIO_ENDPOINT=https://s3.yourdomain.com
# Self-hosted (TrueNAS): MINIO_ENDPOINT=http://minio:9000
# Local dev:             MINIO_ENDPOINT=http://localhost:9000
MINIO_ENDPOINT=
MINIO_ACCESS_KEY_ID=
MINIO_SECRET_ACCESS_KEY=
MINIO_BUCKET_NAME=baysconsult-docs
# Optional: base public URL for direct access (usually leave empty to always use signed URLs)
MINIO_PUBLIC_URL=
# Optional: MinIO hostname for Next.js Image optimization (e.g. s3.yourdomain.com)
MINIO_HOSTNAME=

# Cron authentication (for /api/cron/* endpoints)
CRON_SECRET=

# n8n Webhook URL (optional — for push-based notifications from n8n)
# N8N_WEBHOOK_URL=

# Docker MinIO root credentials (used by docker-compose.yml only — not the app)
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
```

- [ ] **Step 2: Update your local `.env` file (manual step)**

Copy your current `.env` and rename the R2 vars. Your local `.env` should have:
```
MINIO_ENDPOINT=https://e28333b6e9075274cb08f37dcfae6c1f.r2.cloudflarestorage.com
MINIO_ACCESS_KEY_ID=<your-r2-access-key-id>
MINIO_SECRET_ACCESS_KEY=<your-r2-secret>
MINIO_BUCKET_NAME=baysconsult-docs
MINIO_PUBLIC_URL=https://e28333b6e9075274cb08f37dcfae6c1f.r2.cloudflarestorage.com/baysconsult-docs
```

(The R2 endpoint still works with the new env var names — R2 is S3-compatible. You'll replace these values later when MinIO on TrueNAS is running.)

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example with MinIO env vars template"
```

---

## Task 6: Create `Dockerfile` and `.dockerignore`

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

Create `.dockerignore` in the project root:

```
node_modules
.next
.env
.env.local
.env.production
.env.development
truenas-data
.git
*.log
npm-debug.log*
.DS_Store
Thumbs.db
coverage
.nyc_output
```

- [ ] **Step 2: Create `Dockerfile`**

Create `Dockerfile` in the project root:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Verify `output: 'standalone'` is set in `next.config.mjs`**

Run:
```bash
grep "standalone" "D:/THE PROJECT/saas-consulting/next.config.mjs"
```

Expected output:
```
  output: 'standalone',
```

If not present, go back to Task 4.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add Dockerfile for TrueNAS self-hosted deployment"
```

---

## Task 7: Update `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace the full file content**

Replace `docker-compose.yml` with:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env.production
    depends_on:
      minio:
        condition: service_healthy
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    env_file: .env.production
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./truenas-data/minio:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=Asia/Jakarta
      - TZ=Asia/Jakarta
      - N8N_SECURE_COOKIE=false
      - N8N_RUNNERS_ENABLED=true
    volumes:
      - n8n_data:/home/node/.n8n
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  n8n_data:
```

Notes:
- MinIO uses a **bind mount** (`./truenas-data/minio:/data`) so data lives on the TrueNAS dataset pool and survives container restarts.
- `app` waits for MinIO health check before starting.
- Both `app` and `minio` use `env_file: .env.production`. MinIO automatically reads `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from the environment; it ignores the other vars (Clerk, DATABASE_URL, etc.).

- [ ] **Step 2: Verify Compose file is valid**

```bash
cd "D:/THE PROJECT/saas-consulting" && docker compose config 2>&1 | head -30
```

Expected: Compose file prints resolved config with no errors. (If Docker is not installed locally, skip this step and verify on TrueNAS.)

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add MinIO and Next.js app services to docker-compose.yml"
```

---

## Task 8: Create `docker-compose.dev.yml`

**Files:**
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create the file**

Create `docker-compose.dev.yml` in the project root:

```yaml
# Local development overrides
# Usage: docker compose -f docker-compose.dev.yml up -d
# Provides: local PostgreSQL + local MinIO for dev without needing cloud services
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: consult_app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: babybay
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_dev_data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped

volumes:
  postgres_dev_data:
  minio_dev_data:
```

When using this for local dev:
- Set `DATABASE_URL=postgresql://postgres:babybay@localhost:5433/consult_app` in `.env`
- Set `MINIO_ENDPOINT=http://localhost:9000` in `.env`
- Set `MINIO_ACCESS_KEY_ID=minioadmin` and `MINIO_SECRET_ACCESS_KEY=minioadmin` in `.env`

- [ ] **Step 2: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "feat: add docker-compose.dev.yml for local dev (postgres + minio)"
```

---

## Task 9: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Stack line**

In `CLAUDE.md`, find:
```
**Stack:** Next.js 16 App Router · React 19 · TypeScript · Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`) · Tailwind CSS 4 · Clerk auth · Cloudflare R2 (file storage via AWS S3 SDK)
```

Replace with:
```
**Stack:** Next.js 16 App Router · React 19 · TypeScript · Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`) · Tailwind CSS 4 · Clerk auth · MinIO on TrueNAS (file storage via AWS S3 SDK, S3-compatible)
```

- [ ] **Step 2: Update the upload directory comment**

Find:
```
      upload/         # Direct file upload to R2
```

Replace with:
```
      upload/         # Direct file upload to MinIO
```

- [ ] **Step 3: Update the s3.ts description**

Find:
```
    s3.ts             # Cloudflare R2 S3 client
```

Replace with:
```
    s3.ts             # MinIO S3 client (S3-compatible, also works with Cloudflare R2)
```

- [ ] **Step 4: Replace the Required Environment Variables section**

Find and replace the entire `## Required Environment Variables` section:

```markdown
## Required Environment Variables

```
DATABASE_URL                        # PostgreSQL connection string (Neon/Supabase/local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET                # For /api/webhooks/clerk
MINIO_ENDPOINT                      # MinIO S3-compatible endpoint
MINIO_ACCESS_KEY_ID
MINIO_SECRET_ACCESS_KEY
MINIO_BUCKET_NAME
MINIO_PUBLIC_URL                    # Optional: base URL for direct access
MINIO_HOSTNAME                      # Optional: hostname for Next.js Image optimization
CRON_SECRET                         # Bearer token for /api/cron/update-invoices
```

See `.env.example` for a full template with comments.
```

- [ ] **Step 5: Add Docker section at the end of CLAUDE.md**

Append after the Required Environment Variables section:

```markdown
## Docker

Two Compose files support different environments:

```bash
# TrueNAS self-hosted (Next.js app + MinIO + n8n)
docker compose up -d

# Local dev (PostgreSQL + MinIO only — run npm run dev separately)
docker compose -f docker-compose.dev.yml up -d
```

The TrueNAS stack requires a `.env.production` file (copy from `.env.example` and fill in values).  
MinIO data is stored in `./truenas-data/minio/` — a bind mount that maps to the TrueNAS dataset.

## Deployment

| Target | How |
|---|---|
| **Vercel (production)** | Push to `main` branch; set env vars in Vercel dashboard; `MINIO_ENDPOINT` = Cloudflare Tunnel URL |
| **TrueNAS (self-hosted)** | `git pull` on TrueNAS, `docker compose up -d --build`; `MINIO_ENDPOINT=http://minio:9000` (internal Docker) |

Full TrueNAS deployment guide: `docs/deployment/truenas.md`
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for MinIO migration and Docker deployment"
```

---

## Task 10: Create TrueNAS deployment guide

**Files:**
- Create: `docs/deployment/truenas.md`

- [ ] **Step 1: Create the file**

Create `docs/deployment/truenas.md`:

```markdown
# Deployment Guide — TrueNAS Self-Hosted

This guide deploys Bay'sConsult as a full Docker stack on TrueNAS SCALE:
- **Next.js app** — port 3000
- **MinIO** — port 9000 (API), 9001 (Console)
- **n8n** — port 5678

The database (PostgreSQL) stays in the cloud (Neon or Supabase).

---

## Prerequisites

- TrueNAS SCALE with Docker / TrueNAS Apps enabled
- A domain name managed by Cloudflare
- Git installed on TrueNAS (via TrueNAS shell or SSH)
- Docker Compose v2 (`docker compose` not `docker-compose`)

---

## Phase 1 — TrueNAS Dataset Setup

In TrueNAS UI → Datasets, create these datasets under your pool (e.g. `SPIGOM`):

```
SPIGOM/apps/baysconsult          ← project files go here
SPIGOM/apps/baysconsult/minio    ← MinIO data
SPIGOM/backups/postgres          ← database dump backups
SPIGOM/backups/minio             ← MinIO data backups
```

In TrueNAS shell (or SSH), note the mount path:
```bash
ls /mnt/SPIGOM/apps/
```

---

## Phase 2 — Clone the Repository

```bash
cd /mnt/SPIGOM/apps
git clone https://github.com/youruser/saas-consulting.git baysconsult
cd baysconsult
```

Create the MinIO data directory (bind mount target):
```bash
mkdir -p truenas-data/minio
```

---

## Phase 3 — Setup MinIO

Start MinIO first (without the app) to create the bucket:

```bash
# Create a temporary .env with MinIO root credentials
cat > .env.production << 'EOF'
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=changeme_use_strong_password
EOF

docker compose up -d minio
```

Wait 10 seconds, then open MinIO Console in your browser:
```
http://<truenas-ip>:9001
```

Login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, then:

1. **Create bucket:** Click "Create Bucket" → Name: `baysconsult-docs` → Leave all settings default → Save
2. **Create service account:**
   - Go to Administrator → Access Keys → Create Access Key
   - Save the **Access Key** and **Secret Key** — you won't see the secret again
   - These are `MINIO_ACCESS_KEY_ID` and `MINIO_SECRET_ACCESS_KEY` for the app

---

## Phase 4 — Cloudflare Tunnel

Install Cloudflare Tunnel on TrueNAS via **TrueNAS App Catalog** (search "cloudflared") or install the `cloudflared` binary:

```bash
# Download cloudflared binary
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create baysconsult

# Note the tunnel ID from the output — you need it for config
```

Create the tunnel config at `~/.cloudflared/config.yml`:
```yaml
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: s3.yourdomain.com
    service: http://localhost:9000
  - hostname: console.yourdomain.com
    service: http://localhost:9001
  - service: http_status:404
```

Add DNS routes in Cloudflare:
```bash
cloudflared tunnel route dns baysconsult s3.yourdomain.com
cloudflared tunnel route dns baysconsult console.yourdomain.com
```

Start the tunnel:
```bash
cloudflared tunnel run baysconsult
```

Test MinIO is reachable:
```bash
curl https://s3.yourdomain.com/minio/health/live
# Expected: HTTP 200
```

To run cloudflared as a service on TrueNAS:
```bash
cloudflared service install
```

---

## Phase 5 — Configure `.env.production`

Fill in all values in `.env.production` (copy from `.env.example`):

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database (cloud)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# MinIO — uses Docker internal network (not the Cloudflare Tunnel URL)
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY_ID=<service-account-access-key>
MINIO_SECRET_ACCESS_KEY=<service-account-secret>
MINIO_BUCKET_NAME=baysconsult-docs
MINIO_HOSTNAME=s3.yourdomain.com

# MinIO root credentials (for docker-compose.yml)
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<strong-password>

# Cron
CRON_SECRET=<random-hex-string>
```

---

## Phase 6 — Build and Start the App

```bash
# Build and start all services
docker compose up -d --build

# Check logs
docker compose logs app --tail=50

# Run database migrations
docker compose exec app npx prisma migrate deploy
```

Open the app:
```
http://<truenas-ip>:3000
```

Test uploading a document. Check MinIO Console to confirm the file appears in `baysconsult-docs`.

---

## Phase 7 — Update Vercel for Production

In Vercel dashboard → Project → Settings → Environment Variables, set:

```
MINIO_ENDPOINT          = https://s3.yourdomain.com
MINIO_ACCESS_KEY_ID     = <same service account key>
MINIO_SECRET_ACCESS_KEY = <same service account secret>
MINIO_BUCKET_NAME       = baysconsult-docs
MINIO_HOSTNAME          = s3.yourdomain.com
```

Trigger a redeploy. Test upload from the Vercel production URL.

---

## Updating the App

```bash
cd /mnt/SPIGOM/apps/baysconsult
git pull
docker compose up -d --build app
docker compose exec app npx prisma migrate deploy
```

---

## Backup

### PostgreSQL dump (run from TrueNAS shell)
```bash
DATE=$(date +%Y-%m-%d)
docker run --rm postgres:16-alpine \
  pg_dump "<DATABASE_URL>" \
  > /mnt/SPIGOM/backups/postgres/${DATE}.dump
```

### MinIO data backup
```bash
DATE=$(date +%Y-%m-%d)
cp -r /mnt/SPIGOM/apps/baysconsult/truenas-data/minio \
      /mnt/SPIGOM/backups/minio/${DATE}
```

Or use TrueNAS Snapshots on the `baysconsult/minio` dataset for automatic versioned backups.
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment/truenas.md
git commit -m "docs: add TrueNAS self-hosted deployment guide"
```

---

## Task 11: Move architecture doc

**Files:**
- Create: `docs/architecture/truenas.md` (moved content)
- Delete: `accounting_crm_truenas_architecture.md`

- [ ] **Step 1: Move the file with git**

```bash
cd "D:/THE PROJECT/saas-consulting"
git mv accounting_crm_truenas_architecture.md docs/architecture/truenas.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/truenas.md
git commit -m "docs: move architecture doc to docs/architecture/truenas.md"
```

---

## Task 12: Final verification

- [ ] **Step 1: TypeScript check — no errors**

```bash
cd "D:/THE PROJECT/saas-consulting" && npx tsc --noEmit --pretty 2>&1 | tail -5
```

Expected: `Found 0 errors.` (or only pre-existing unrelated errors).

- [ ] **Step 2: Lint check**

```bash
cd "D:/THE PROJECT/saas-consulting" && npm run lint 2>&1 | tail -10
```

Expected: no new errors introduced by this migration.

- [ ] **Step 3: Grep to confirm no stale R2_ references in app code**

```bash
cd "D:/THE PROJECT/saas-consulting" && grep -r "R2_" src/ --include="*.ts" --include="*.tsx" 2>&1
```

Expected: no output (all R2 references replaced with MINIO_).

- [ ] **Step 4: Commit summary**

```bash
git log --oneline -10
```

Expected: 10 commits visible — one per task above. If any are missing, go back and commit them.

---

## Post-Implementation: Cloudflare R2 Cleanup

After verifying MinIO on TrueNAS is working in production for a few days, you can optionally:

1. Export any existing files from Cloudflare R2 bucket to MinIO (use `rclone`)
2. Revoke the old R2 API keys in Cloudflare dashboard
3. Remove R2_* variables from any leftover `.env` files

This is optional and should be done manually — not automated.
```
