# Neon + TrueNAS Storage Split

Use Neon only as the primary Postgres database. Store large binary files in TrueNAS MinIO.

## What Goes In Neon

- Users, clients, roles, permits, invoices, deadlines, journals, accounts, balances.
- Document metadata: file name, size, MIME/file type, storage URL/key, OCR status, OCR JSON, audit fields.
- Import batches and annual tax mapping records.

Do not store document bytes, photos, scans, PDFs, Excel workbooks, or generated export files in Postgres.

## What Goes In TrueNAS MinIO

- Uploaded client documents.
- Permit attachments.
- Accounting source documents for OCR.
- Annual SPT workbooks and generated review/export files.
- Photos and other large media.

The app stores only the object key or URL in Neon, then uses presigned URLs for access.

## Environment Variables

Use a Neon pooled connection string for the app:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Keep an optional direct connection string for migrations or admin scripts:

```env
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Use TrueNAS MinIO for object storage:

```env
MINIO_ENDPOINT=https://s3.yourdomain.com
MINIO_ACCESS_KEY_ID=<service-account-key>
MINIO_SECRET_ACCESS_KEY=<service-account-secret>
MINIO_BUCKET_NAME=website-docs
MINIO_PUBLIC_URL=https://s3.yourdomain.com/website-docs
MINIO_HOSTNAME=s3.yourdomain.com
```

For Docker deployed on the same TrueNAS network, `MINIO_ENDPOINT` can be the internal address instead:

```env
MINIO_ENDPOINT=http://minio:9000
```

## Neon Notes

- Use the pooled Neon connection for the running app because Next.js can open many concurrent server-side connections.
- Use direct Neon connections only for administrative operations that require session-level behavior.
- Neon read replicas can be added later for heavy reporting, but keep writes on the primary database.

## Storage Notes

- Keep the MinIO bucket private.
- Grant the app a service account with bucket-scoped access.
- Serve downloads and previews through presigned URLs.
- Enable MinIO bucket versioning/backups from TrueNAS for recovery.
