# High-Level Architecture — Accounting Consultant CRM Multi-Tenant

## 1. Tujuan Arsitektur

Dokumen ini menjelaskan arsitektur high-level untuk aplikasi **CRM konsultan accounting multi-tenant** dengan kombinasi:

- **Vercel / Next.js** sebagai frontend dan application layer.
- **Supabase PostgreSQL / Neon PostgreSQL** sebagai database utama.
- **TrueNAS + MinIO** sebagai private object storage untuk dokumen.
- **External HDD/SSD** sebagai backup, bukan storage production utama.

Arsitektur ini cocok untuk aplikasi yang menangani:

- Data tenant/accounting firm.
- Client perusahaan dari masing-masing tenant.
- Dokumen accounting seperti invoice, bank statement, laporan pajak, payroll, financial report, dan kontrak.
- Workflow bulanan accounting.
- Role dan permission antar user.
- Audit log dan version history dokumen.

---

## 2. Prinsip Utama

### 2.1 Jangan Menaruh Database Utama di NAS

Untuk aplikasi production multi-tenant, database utama sebaiknya tetap berada di cloud database seperti:

- Supabase PostgreSQL
- Neon PostgreSQL
- AWS RDS PostgreSQL
- Railway PostgreSQL

TrueNAS tidak dijadikan database utama karena risiko:

- Internet rumah/kantor down.
- Listrik mati.
- IP berubah.
- Latency tinggi dari Vercel ke NAS.
- Keamanan PostgreSQL lebih sulit jika diekspos ke internet.
- Backup dan disaster recovery lebih berat.

### 2.2 TrueNAS Digunakan Sebagai File Storage

TrueNAS digunakan sebagai tempat penyimpanan file/dokumen melalui **MinIO**, bukan sebagai folder public langsung.

Jenis file yang cocok disimpan:

- PDF invoice.
- Bank statement.
- Tax report.
- Bukti pembayaran.
- Payroll document.
- Contract.
- Client onboarding document.
- Generated report.

### 2.3 External Storage Digunakan untuk Backup

External HDD/SSD boleh dibaca oleh TrueNAS, tetapi lebih baik digunakan untuk:

- Import/copy data lama.
- Backup berkala.
- Offsite backup.
- Recovery copy.

External USB drive tidak ideal untuk storage production utama.

---

## 3. High-Level Architecture Diagram

```text
User / Staff / Client
        |
        v
Vercel / Next.js App
        |
        +----------------------------+
        |                            |
        v                            v
Cloud PostgreSQL                 TrueNAS + MinIO
Supabase / Neon                  Private Object Storage
        |                            |
        |                            v
        |                       File Documents
        |                       PDF, XLSX, Images
        |
        v
Metadata, Tenant Data,
Client Data, Tasks,
Audit Logs, Permissions

Backup Layer:
TrueNAS Dataset / MinIO Data
        |
        v
External HDD/SSD Backup
```

---

## 4. Recommended Stack

### 4.1 Application Layer

```text
Frontend: Next.js
Hosting: Vercel
Auth: Clerk Organizations / Supabase Auth
API: Next.js Route Handlers / Server Actions
ORM: Prisma / Drizzle
```

### 4.2 Database Layer

```text
Database: Supabase PostgreSQL / Neon PostgreSQL
Use case:
- tenants
- users
- memberships
- clients
- contacts
- tasks
- accounting periods
- document metadata
- audit logs
```

### 4.3 Storage Layer

```text
NAS OS: TrueNAS SCALE
Object Storage: MinIO
Bucket: crm-documents-prod
Access: Private only
Download/View: Signed URL
Upload: Presigned upload URL
```

### 4.4 Backup Layer

```text
Primary file storage: Internal TrueNAS pool
Backup target: External HDD/SSD
Backup content:
- MinIO object data
- PostgreSQL dump
- TrueNAS config backup
```

---

## 5. Multi-Tenant Model

### 5.1 Entity Definition

```text
Tenant = Accounting firm / consultant company
Client = Business/company served by the tenant
User = Staff, accountant, reviewer, admin, or client user
```

Example:

```text
Tenant: TheBays Accounting Consultant
  ├── Client: NJS Florist
  ├── Client: AkarForge
  ├── Client: Bali Villa Group
  └── Users: Admin, Accountant, Reviewer, Client User
```

### 5.2 Recommended Tenant Isolation

Use **shared database + shared schema + tenant_id** for MVP.

Every important table should contain:

```text
tenant_id
```

Example:

```text
clients
- id
- tenant_id
- name
- tax_number
- status

files/documents
- id
- tenant_id
- client_id
- storage_key
- file_name
- status
```

### 5.3 Enterprise Upgrade Path

For future enterprise clients:

```text
Regular tenant:
Shared database + tenant_id isolation

Premium tenant:
Dedicated schema or dedicated bucket prefix

Enterprise tenant:
Dedicated database + dedicated bucket + custom backup policy
```

---

## 6. Core Database Tables

### 6.1 Tenants

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.2 Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.3 Memberships

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
```

### 6.4 Clients

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  business_type TEXT,
  tax_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.5 Documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT,
  period_month INT,
  period_year INT,
  status TEXT DEFAULT 'uploaded',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.6 Document Versions

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  storage_key TEXT NOT NULL,
  version_number INT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.7 Tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  assigned_to UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMP DEFAULT now()
);
```

### 6.8 Accounting Periods

```sql
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  month INT NOT NULL,
  year INT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (tenant_id, client_id, month, year)
);
```

### 6.9 Audit Logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 7. TrueNAS Dataset Structure

Recommended dataset structure:

```text
pool_utama/
  apps/
    minio/
  object-storage/
    crm-documents/
  backups/
    postgres/
    minio/
    truenas-config/
```

Example if pool name is `SPIGOM`:

```text
SPIGOM/apps/minio
SPIGOM/object-storage/crm-documents
SPIGOM/backups/postgres
SPIGOM/backups/minio
SPIGOM/backups/truenas-config
```

---

## 8. MinIO Bucket Structure

Bucket name:

```text
crm-documents-prod
```

Storage key pattern:

```text
tenant/{tenant_id}/client/{client_id}/documents/{year}/{month}/{document_id}-{filename}
```

Example:

```text
tenant/tenant_123/client/client_456/documents/2026/05/doc_789-bank-statement.pdf
```

Another example:

```text
tenant/tenant_abc/client/client_njs/documents/2026/05/doc_001-invoice-may-2026.pdf
```

---

## 9. Upload Flow

```text
User selects file
        |
        v
Frontend requests upload URL from backend
        |
        v
Backend checks:
- Is user logged in?
- Is user member of tenant?
- Does user have permission for this client?
- Is file type allowed?
- Is file size allowed?
        |
        v
Backend creates presigned upload URL from MinIO
        |
        v
Frontend uploads file directly to MinIO
        |
        v
Backend saves metadata to PostgreSQL
        |
        v
Audit log is created
```

Important rule:

```text
Never expose MinIO access key or secret key to frontend.
```

---

## 10. View / Download Flow

```text
User clicks View or Download
        |
        v
Backend checks permission
        |
        v
Backend validates tenant_id and client_id
        |
        v
Backend creates signed download URL
        |
        v
User accesses temporary file URL
```

Recommended signed URL expiration:

```text
Preview: 5–15 minutes
Download: 5 minutes
```

---

## 11. Edit File Behavior

### 11.1 Supported in MVP

For MVP, support these actions:

```text
View file
Download file
Upload file
Replace file
Rename file metadata
Change category
Change accounting period
Add comment
Approve/reject document
Version history
```

### 11.2 Not Recommended for MVP

Avoid direct browser editing for now:

```text
Edit DOCX directly in browser
Edit XLSX directly in browser
Collaborative editing like Google Docs
```

If needed later, integrate:

```text
OnlyOffice Document Server
Collabora Online
Google Drive API
Microsoft 365 integration
```

---

## 12. Role and Permission Model

### 12.1 Roles

```text
Owner
Admin
Accountant
Reviewer
Client
Read-only
```

### 12.2 Permission Matrix

| Action | Owner | Admin | Accountant | Reviewer | Client | Read-only |
|---|---:|---:|---:|---:|---:|---:|
| Manage tenant settings | Yes | Limited | No | No | No | No |
| Manage users | Yes | Yes | No | No | No | No |
| Create client | Yes | Yes | Limited | No | No | No |
| View assigned client | Yes | Yes | Yes | Yes | Own only | Yes |
| Upload document | Yes | Yes | Yes | Yes | Own only | No |
| Download document | Yes | Yes | Yes | Yes | Own only | Yes |
| Replace document | Yes | Yes | Yes | Limited | Own pending only | No |
| Approve document | Yes | Yes | No | Yes | No | No |
| Delete document | Yes | Yes | Limited | No | No | No |
| View audit log | Yes | Yes | No | Limited | No | No |

---

## 13. Security Rules

### 13.1 Database Security

Every query must be scoped by:

```text
tenant_id
```

Example safe query:

```sql
SELECT * FROM documents
WHERE tenant_id = $1
AND client_id = $2;
```

Avoid unsafe query:

```sql
SELECT * FROM documents
WHERE client_id = $1;
```

### 13.2 Storage Security

Never make the bucket public.

Use:

```text
Private bucket
Signed URL
Presigned upload URL
Tenant permission check
Role permission check
Audit log
```

### 13.3 Cache Security

Cache keys must include tenant ID.

Correct:

```text
tenant:{tenant_id}:client:{client_id}:dashboard
```

Incorrect:

```text
client:{client_id}:dashboard
```

### 13.4 Queue Security

Every job payload must include tenant ID.

```json
{
  "tenant_id": "tenant_123",
  "client_id": "client_456",
  "document_id": "doc_789",
  "job_type": "process_document"
}
```

---

## 14. TrueNAS + MinIO Network Exposure

### Recommended: Cloudflare Tunnel

```text
Vercel App
   |
   v
https://s3.yourdomain.com
   |
   v
Cloudflare Tunnel
   |
   v
TrueNAS MinIO API :9000
```

Recommended subdomains:

```text
s3.yourdomain.com       -> MinIO API
console.yourdomain.com  -> MinIO Console, protected or local only
```

Do not expose MinIO console publicly without protection.

### Alternative: VPS Reverse Proxy

```text
Vercel
  |
  v
VPS Reverse Proxy
  |
  v
VPN / Tailscale / WireGuard
  |
  v
TrueNAS MinIO
```

This is better for production if reliability is critical.

### Not Recommended: Direct Port Forwarding

Avoid exposing TrueNAS or MinIO directly via router port forwarding unless you understand firewall, TLS, access control, and monitoring.

---

## 15. Environment Variables for Vercel

```env
S3_ENDPOINT=https://s3.yourdomain.com
S3_REGION=us-east-1
S3_BUCKET=crm-documents-prod
S3_ACCESS_KEY_ID=your_minio_access_key
S3_SECRET_ACCESS_KEY=your_minio_secret_key
S3_FORCE_PATH_STYLE=true

DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

For MinIO, `S3_FORCE_PATH_STYLE=true` is usually required.

---

## 16. Backup Strategy

### 16.1 Backup Targets

```text
TrueNAS internal pool -> External HDD/SSD
Cloud PostgreSQL -> Dump file -> TrueNAS backup dataset
TrueNAS config -> External HDD/SSD
```

### 16.2 Backup Folder Structure

```text
external-backup/
  crm/
    postgres/
      2026-05-27.dump
    minio/
      2026-05-27/
    truenas-config/
      2026-05-27.tar
```

### 16.3 Minimum Backup Policy

```text
Daily database dump
Daily or weekly MinIO backup
Weekly TrueNAS config backup
Monthly offline backup copy
```

### 16.4 Better Backup Policy

```text
3-2-1 Backup Rule:
3 copies of data
2 different storage media
1 offsite backup
```

Example:

```text
Copy 1: TrueNAS internal pool
Copy 2: External HDD
Copy 3: Cloud backup / offsite drive
```

---

## 17. Suggested MVP Features

### 17.1 Tenant Management

```text
Create tenant
Invite members
Assign role
Switch active tenant
Tenant settings
```

### 17.2 Client Management

```text
Create client company
Add contact person
Set tax number
Set client status
Assign accountant
```

### 17.3 Document Management

```text
Upload document
Preview document
Download document
Replace document
Document version history
Document category
Accounting period tagging
Approval status
```

### 17.4 Accounting Workflow

```text
Monthly accounting period
Checklist per client
Document request
Bookkeeping task
Review task
Tax filing task
Report sent status
```

### 17.5 Audit Log

```text
User login
File upload
File download
File replacement
Client created
Task completed
Document approved
Role changed
```

---

## 18. Accounting Workflow Example

```text
Client Onboarding
        |
        v
Request Documents
        |
        v
Upload Documents
        |
        v
Accountant Review
        |
        v
Bookkeeping
        |
        v
Reviewer Approval
        |
        v
Generate Monthly Report
        |
        v
Send Report to Client
        |
        v
Close Accounting Period
```

Monthly checklist example:

```text
- Request bank statement
- Request sales invoice
- Request purchase invoice
- Request payroll data
- Reconcile bank transaction
- Prepare financial report
- Review financial report
- Send report to client
- Mark period as closed
```

---

## 19. AI Layer Optional

If AI is added later, use tenant-isolated RAG.

```text
Document Upload
        |
        v
OCR / Parser
        |
        v
Chunking
        |
        v
Embedding with metadata:
- tenant_id
- client_id
- document_id
        |
        v
Vector Database
        |
        v
Tenant-filtered Retrieval
        |
        v
AI Assistant
```

Strict rule:

```text
AI retrieval must always filter by tenant_id.
```

AI use cases:

```text
Summarize client status
Find missing documents
Draft reminder message
Extract invoice data
Explain monthly checklist
Generate report summary
```

---

## 20. Deployment Phases

### Phase 1 — Local NAS Setup

```text
1. Confirm TrueNAS pool is ready
2. Create dataset for MinIO
3. Install MinIO app
4. Create private bucket
5. Create access key for app
6. Test upload/download locally
```

### Phase 2 — Cloud Database Setup

```text
1. Create Supabase/Neon project
2. Create core tables
3. Add tenant_id to all business tables
4. Add auth integration
5. Test tenant-scoped queries
```

### Phase 3 — Vercel App Integration

```text
1. Create Next.js app
2. Add environment variables
3. Connect to PostgreSQL
4. Connect to MinIO using S3 SDK
5. Build upload flow
6. Build download/view flow
```

### Phase 4 — External Access

```text
1. Configure Cloudflare Tunnel or VPS reverse proxy
2. Map s3.yourdomain.com to MinIO API
3. Keep MinIO console protected
4. Test upload from Vercel
5. Test signed URL download
```

### Phase 5 — Backup

```text
1. Connect external HDD/SSD
2. Create backup dataset/folder
3. Schedule backup for MinIO data
4. Schedule PostgreSQL dump
5. Test restore process
```

---

## 21. Final Recommended Architecture

```text
Production App:
Vercel + Next.js

Database:
Supabase PostgreSQL / Neon PostgreSQL

File Storage:
TrueNAS + MinIO

Public Access to Storage:
Cloudflare Tunnel or VPS Reverse Proxy

Access Control:
Application-level permission + signed URL

Backup:
External HDD/SSD + optional cloud backup
```

Final diagram:

```text
User Browser
    |
    v
Vercel Next.js App
    |
    +------------------------------+
    |                              |
    v                              v
Supabase/Neon PostgreSQL       MinIO on TrueNAS
Tenant data                    File objects
Client data                    PDF/XLSX/images
Tasks                          Private bucket
Metadata                       Signed URLs
Audit logs                     Versioned files
    |                              |
    |                              v
    |                         External HDD Backup
    |
    v
Application Security
RBAC + tenant_id + audit log
```

---

## 22. Conclusion

The safest architecture for this project is:

```text
Vercel = application/frontend
Supabase or Neon = main PostgreSQL database
TrueNAS + MinIO = private file storage
External HDD/SSD = backup, not production primary storage
```

Users should never access TrueNAS directly. They should only access files through the application after:

```text
Authentication
Tenant validation
Role validation
Signed URL generation
Audit logging
```

This architecture is practical for an MVP, scalable for 20+ clients, and can evolve into a more enterprise-ready system later.
