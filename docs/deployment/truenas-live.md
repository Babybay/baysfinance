# TrueNAS Live Deployment

This deployment keeps Neon as the primary Postgres database and uses TrueNAS/MinIO only for large files.

## Target Architecture

- TrueNAS runs the Next.js app containers.
- Nginx runs inside Docker as a load balancer for `app1` and `app2`.
- Neon stores primary application data.
- TrueNAS MinIO stores PDFs, images, scans, Excel workbooks, and exports.
- Public traffic goes to `http://TRUENAS_IP:8080` first, then can be placed behind a reverse proxy or Cloudflare Tunnel for HTTPS.

## Files Used

- `Dockerfile` builds the Next.js standalone production image.
- `docker-compose.truenas.yml` runs database migration, two app containers, and Nginx load balancer.
- `.env.truenas` stores production secrets on TrueNAS only.
- `nginx.conf` proxies traffic to the two app containers and allows uploads up to 100 MB.

## 1. Prepare Neon

1. Create a Neon project and database.
2. Copy the pooled connection string.
3. Use the pooled URL for `DATABASE_URL`.
4. Keep the direct URL as `DIRECT_URL` only for migration/admin usage if needed.

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 2. Prepare TrueNAS MinIO

1. Enable or install MinIO/S3-compatible object storage on TrueNAS.
2. Create a private bucket, for example `website-docs`.
3. Create an access key and secret key scoped to that bucket.
4. Decide the endpoint:
   - Internal/LAN: `http://TRUENAS_IP:9000`
   - Public HTTPS reverse proxy: `https://s3.yourdomain.com`

The app does not store file bytes in Neon. It stores only file metadata and storage URLs/keys.

## 3. Copy Project To TrueNAS

Recommended dataset:

```text
/mnt/<pool>/apps/website
```

Copy this repository into that folder using Git, SMB, or SCP.

Example over SSH:

```bash
cd /mnt/<pool>/apps
git clone <your-repo-url> website
cd website
```

If you copy files manually, include:

- `Dockerfile`
- `docker-compose.truenas.yml`
- `nginx.conf`
- `package.json`
- `package-lock.json`
- `prisma/`
- `src/`
- `public/`
- `eng.traineddata`
- `ind.traineddata`

Do not copy `.env` from a local machine if it contains old database/storage secrets.

## 4. Create `.env.truenas`

On TrueNAS:

```bash
cp .env.truenas.example .env.truenas
```

Edit `.env.truenas`:

```env
APP_PORT=8080

AUTH_SECRET=<long-random-secret>
AUTH_URL=http://TRUENAS_IP:8080

DATABASE_URL=<neon-pooled-url>
DIRECT_URL=<neon-direct-url-if-used>

MINIO_ENDPOINT=http://TRUENAS_IP:9000
MINIO_ACCESS_KEY_ID=<minio-access-key>
MINIO_SECRET_ACCESS_KEY=<minio-secret-key>
MINIO_BUCKET_NAME=website-docs
MINIO_PUBLIC_URL=http://TRUENAS_IP:9000/website-docs
MINIO_HOSTNAME=TRUENAS_IP
MINIO_REGION=us-east-1

CRON_SECRET=<long-random-secret>
OCR_SERVICE_URL=http://host.docker.internal:8100
```

Generate secrets with:

```bash
openssl rand -base64 32
```

When using a real domain later, change:

```env
AUTH_URL=https://yourdomain.com
MINIO_PUBLIC_URL=https://s3.yourdomain.com/website-docs
MINIO_HOSTNAME=s3.yourdomain.com
```

## 5. Start The App

From the project folder on TrueNAS:

```bash
docker compose -f docker-compose.truenas.yml up -d --build
```

The compose file reads `.env.truenas` by default. For testing with another env file, set `APP_ENV_FILE` before running compose.

This will:

1. Build the migration container.
2. Run `prisma migrate deploy` against Neon.
3. Build and start `app1`.
4. Build and start `app2`.
5. Start Nginx load balancer on `APP_PORT`.

Check status:

```bash
docker compose -f docker-compose.truenas.yml ps
```

Check logs:

```bash
docker compose -f docker-compose.truenas.yml logs -f --tail=100
```

## 6. Verify It Is Visible

From a browser on the same network:

```text
http://TRUENAS_IP:8080
```

Health checks:

```text
http://TRUENAS_IP:8080/lb-health
http://TRUENAS_IP:8080/api/health
```

Expected result:

- `/lb-health` returns `ok`.
- `/api/health` returns HTTP `200`.
- `/sign-in` loads the web app.

## 7. Make It Public With HTTPS

Use one of these approaches:

### Option A: Reverse Proxy

Point a reverse proxy to:

```text
http://TRUENAS_IP:8080
```

Then update `.env.truenas`:

```env
AUTH_URL=https://yourdomain.com
```

Restart:

```bash
docker compose -f docker-compose.truenas.yml up -d
```

### Option B: Cloudflare Tunnel

Create a tunnel to:

```text
http://TRUENAS_IP:8080
```

Then set:

```env
AUTH_URL=https://yourdomain.com
```

Restart the app after changing environment values.

## 8. Updating The Website

Pull or copy the latest code, then run:

```bash
docker compose -f docker-compose.truenas.yml up -d --build
```

If only environment values changed:

```bash
docker compose -f docker-compose.truenas.yml up -d --force-recreate
```

## 9. Backup Strategy

Back up:

- Neon database backups/snapshots.
- TrueNAS MinIO bucket dataset.
- `.env.truenas` in a secure password manager.

Do not rely on Docker containers for persistent business data. Containers should be replaceable.

## TrueNAS Apps UI Note

TrueNAS 24.10 and newer include custom app flows and an "Install via YAML" option for Docker Compose-style deployments. This repository is prepared for direct Docker Compose from a project folder because it needs a local build context. If you prefer the Apps UI YAML editor, first build and push the app image to a registry, then replace the `build:` blocks with `image: your-registry/your-image:tag`.
