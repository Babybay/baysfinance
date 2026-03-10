# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma db push   # Push schema changes without migration history
npx prisma db seed   # Seed database with realistic sample data
npx prisma studio    # Open Prisma Studio GUI
```

## Architecture Overview

**Bay'sConsult** is an Indonesian tax consulting SaaS for managing clients, tax deadlines, documents, invoices, permits, and accounting.

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`) · Tailwind CSS 4 · Clerk auth · Cloudflare R2 (file storage via AWS S3 SDK)

### Key Patterns

**Server Actions** (`src/app/actions/`) are the primary data layer — all DB reads/writes go through `"use server"` functions. Pages fetch data server-side and pass it to client components. Actions always return `{ success: boolean, data?: ..., error?: string }`.

**Soft Deletes** are handled globally in `src/lib/prisma.ts`. The Prisma client is extended with middleware that intercepts `delete`/`deleteMany` on most models and converts them to `{ deletedAt: new Date() }` updates. `findMany`/`findUnique`/`findFirst` automatically filter `deletedAt: null`. Affected models: `Client`, `TaxDeadline`, `Document`, `Invoice`, `PermitCase`, `JournalEntry`, `Payment`, `RecurringInvoice`, `Account`.

**Auth & RBAC:** Clerk handles authentication. User role (`"admin"` or `"client"`) and `clientId` are stored in Clerk `publicMetadata`. The dashboard layout (`src/app/dashboard/layout.tsx`) reads these and wraps children in `<RoleProvider>`. Client components access roles via `useRoles()` hook. Admin/staff users are synced to the local `User` DB model via the Clerk webhook (`/api/webhooks/clerk`).

**Multi-tenancy:** Client-role users only see their own data. Server actions accept an optional `clientId` parameter — when provided, queries filter by it. When `role === "client"`, pages extract `clientId` from Clerk metadata and pass it down.

**i18n:** Custom React context in `src/lib/i18n.tsx`. Supports `"en"` and `"id"` (Indonesian is default). Locale is persisted in `localStorage("pajak_locale")`. Access translations via `const { t } = useI18n()` in client components. All translation keys are defined in `src/lib/translations/en.ts` (source of truth).

### Directory Structure

```
src/
  app/
    actions/          # Server Actions (data layer)
    api/
      webhooks/clerk/ # Clerk user sync webhook
      upload/         # Direct file upload to R2
      documents/presigned/ # Presigned URLs for file access
      cron/           # update-invoices (marks overdue; needs CRON_SECRET)
    dashboard/        # All dashboard pages
      accounting/     # Chart of accounts, journal, ledger, reports
      clients/        # Client management (admin only)
      permits/        # Scalable permit case management
      invoices/       # Invoice + recurring invoices
      documents/      # Document management
      tax-calendar/   # Tax deadline tracking
      reports/        # Business reports
  components/
    layout/           # DashboardShell (sidebar + header), Navbar, Footer
    ui/               # Reusable UI primitives (Button, Card, Modal, etc.)
    dashboard/        # Feature-specific components (PermitList, etc.)
  lib/
    prisma.ts         # Prisma client singleton with soft-delete middleware
    data.ts           # Shared TypeScript interfaces + utility functions
    i18n.tsx          # I18nProvider + useI18n hook
    s3.ts             # Cloudflare R2 S3 client
    nib-api.ts        # Mock Indonesian govt APIs (Dukcapil, DJP, OSS, BSrE)
    accounting-helpers.ts  # Journal balance validation
    hooks/useRoles.tsx # RoleProvider + useRoles hook
    translations/     # en.ts and id.ts translation files
prisma/
  schema.prisma       # Database schema
  seed.ts             # Realistic seed data
```

### Permit System

The permit system is template-driven:
- `PermitType` defines a permit category with required document and checklist templates (seeded: NIB, PBG, PT/CV)
- `PermitCase` is a specific permit application, auto-generated with documents/checklists from the type template
- Case IDs are auto-generated sequentially (e.g., `NIB-2026-02-0001`) using `PermitCounter` with atomic upsert
- `automateNIBFlow()` in `src/app/actions/permits.ts` runs a mock multi-step flow through govt APIs (Dukcapil → DJP → OSS → BSrE); all API calls in `src/lib/nib-api.ts` are mocks

### Language Note

Field names and enum values in the DB/Prisma schema use Indonesian (e.g., `nama`, `alamat`, `jenisWP`, `BelumLapor`, `SudahLapor`, `Terlambat`). The `src/lib/data.ts` file defines the canonical frontend TypeScript interfaces.

## Required Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET  # For /api/webhooks/clerk
R2_ENDPOINT           # Cloudflare R2 S3-compatible endpoint
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
CRON_SECRET           # Bearer token for /api/cron/update-invoices
```
