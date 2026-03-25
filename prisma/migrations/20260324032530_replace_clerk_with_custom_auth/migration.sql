-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Staff', 'Client');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Draft', 'Terkirim', 'Lunas', 'JatuhTempo');

-- CreateEnum
CREATE TYPE "TaxDeadlineStatus" AS ENUM ('BelumLapor', 'SudahLapor', 'Terlambat');

-- CreateEnum
CREATE TYPE "DocumentKategori" AS ENUM ('FakturPajak', 'BuktiPotong', 'SPT', 'LaporanKeuangan', 'Lainnya');

-- CreateEnum
CREATE TYPE "PermitCaseStatus" AS ENUM ('Draft', 'WaitingDocument', 'Verification', 'RevisionRequired', 'Processing', 'Issued', 'Completed', 'Cancelled', 'OnHold');

-- CreateEnum
CREATE TYPE "PermitPriority" AS ENUM ('Low', 'Medium', 'High');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "JenisWP" AS ENUM ('OrangPribadi', 'Badan');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('Aktif', 'TidakAktif');

-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('Monthly', 'Quarterly', 'Yearly');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('Draft', 'Posted');

-- CreateEnum
CREATE TYPE "AccDocType" AS ENUM ('SalesInvoice', 'PurchaseInvoice', 'ExpenseReceipt', 'BankStatement', 'FinancialReport', 'Other');

-- CreateEnum
CREATE TYPE "AccDocModule" AS ENUM ('Receivable', 'Payable', 'Expense', 'Cashflow', 'FinancialReport');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Client',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "npwp" TEXT NOT NULL,
    "jenisWP" "JenisWP" NOT NULL,
    "email" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_deadlines" (
    "id" TEXT NOT NULL,
    "jenisPajak" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tanggalBatas" TIMESTAMP(3) NOT NULL,
    "masaPajak" TEXT NOT NULL,
    "status" "TaxDeadlineStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "tax_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "DocumentKategori" NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "tanggalUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "catatan" TEXT,
    "fileUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "permitCaseId" TEXT,
    "invoiceId" TEXT,
    "deadlineId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "nomorInvoice" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jatuhTempo" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "ppn" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "recurringInvoiceId" TEXT,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientNpwp" TEXT,
    "clientAlamat" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "harga" DOUBLE PRECISION NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "tanggalBayar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodePembayaran" TEXT,
    "buktiUrl" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" TEXT NOT NULL,
    "interval" "RecurringInterval" NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_items" (
    "id" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "harga" DOUBLE PRECISION NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,

    CONSTRAINT "recurring_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_types" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caseIdPrefix" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,

    CONSTRAINT "permit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_type_documents" (
    "id" TEXT NOT NULL,
    "permitTypeId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permit_type_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_type_checklists" (
    "id" TEXT NOT NULL,
    "permitTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permit_type_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_counters" (
    "id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_cases" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "permitTypeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "advisorId" TEXT,
    "serviceType" TEXT NOT NULL,
    "riskCategory" TEXT NOT NULL,
    "status" "PermitCaseStatus" NOT NULL,
    "priority" "PermitPriority" NOT NULL DEFAULT 'Medium',
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "applicationData" JSONB,
    "deadline" TIMESTAMP(3),
    "cancelReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "permit_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL,
    "comments" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_checklists" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "checkedBy" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_activities" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permit_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_comments" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_deadlines" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "refNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" "JournalStatus" NOT NULL DEFAULT 'Draft',
    "clientId" TEXT NOT NULL,
    "totalDebit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "importBatchId" TEXT,
    "source" TEXT,
    "relatedEntryId" TEXT,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_items" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_period_closes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "netIncome" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_period_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_documents" (
    "id" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentType" "AccDocType" NOT NULL,
    "linkedModule" "AccDocModule",
    "documentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ocrStatus" TEXT,
    "ocrData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "accounting_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "period" TEXT,
    "companyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "entriesCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "importedBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "depreciationRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "costPrev" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "mutasiIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "mutasiOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "costCurrent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumDeprecPrev" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deprecCurrentIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deprecCurrentOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumDeprecCurrent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bookValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_report_snapshots" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE INDEX "tax_deadlines_clientId_status_idx" ON "tax_deadlines"("clientId", "status");

-- CreateIndex
CREATE INDEX "documents_clientId_idx" ON "documents"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_nomorInvoice_key" ON "invoices"("nomorInvoice");

-- CreateIndex
CREATE INDEX "invoices_clientId_status_idx" ON "invoices"("clientId", "status");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "recurring_invoices_clientId_idx" ON "recurring_invoices"("clientId");

-- CreateIndex
CREATE INDEX "recurring_invoice_items_recurringInvoiceId_idx" ON "recurring_invoice_items"("recurringInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "permit_types_slug_key" ON "permit_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "permit_cases_caseId_key" ON "permit_cases"("caseId");

-- CreateIndex
CREATE INDEX "permit_cases_clientId_status_idx" ON "permit_cases"("clientId", "status");

-- CreateIndex
CREATE INDEX "permit_cases_permitTypeId_idx" ON "permit_cases"("permitTypeId");

-- CreateIndex
CREATE INDEX "permit_documents_caseId_idx" ON "permit_documents"("caseId");

-- CreateIndex
CREATE INDEX "permit_checklists_caseId_idx" ON "permit_checklists"("caseId");

-- CreateIndex
CREATE INDEX "permit_activities_caseId_createdAt_idx" ON "permit_activities"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "permit_comments_caseId_createdAt_idx" ON "permit_comments"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "permit_deadlines_caseId_idx" ON "permit_deadlines"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_clientId_key" ON "accounts"("code", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_refNumber_key" ON "journal_entries"("refNumber");

-- CreateIndex
CREATE INDEX "journal_entries_clientId_status_idx" ON "journal_entries"("clientId", "status");

-- CreateIndex
CREATE INDEX "journal_entries_clientId_date_idx" ON "journal_entries"("clientId", "date");

-- CreateIndex
CREATE INDEX "journal_entries_clientId_source_date_idx" ON "journal_entries"("clientId", "source", "date");

-- CreateIndex
CREATE INDEX "journal_items_journalEntryId_idx" ON "journal_items"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_items_accountId_idx" ON "journal_items"("accountId");

-- CreateIndex
CREATE INDEX "journal_items_accountId_journalEntryId_idx" ON "journal_items"("accountId", "journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_period_closes_journalEntryId_key" ON "fiscal_period_closes"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_period_closes_clientId_periodLabel_key" ON "fiscal_period_closes"("clientId", "periodLabel");

-- CreateIndex
CREATE INDEX "accounting_documents_clientId_documentType_idx" ON "accounting_documents"("clientId", "documentType");

-- CreateIndex
CREATE INDEX "accounting_documents_clientId_linkedModule_idx" ON "accounting_documents"("clientId", "linkedModule");

-- CreateIndex
CREATE INDEX "import_batches_clientId_createdAt_idx" ON "import_batches"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "fixed_assets_clientId_source_idx" ON "fixed_assets"("clientId", "source");

-- CreateIndex
CREATE INDEX "fixed_assets_importBatchId_idx" ON "fixed_assets"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_report_snapshots_clientId_period_reportType_key" ON "financial_report_snapshots"("clientId", "period", "reportType");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deadlines" ADD CONSTRAINT "tax_deadlines_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deadlines" ADD CONSTRAINT "tax_deadlines_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "tax_deadlines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_permitCaseId_fkey" FOREIGN KEY ("permitCaseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "recurring_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "recurring_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_type_documents" ADD CONSTRAINT "permit_type_documents_permitTypeId_fkey" FOREIGN KEY ("permitTypeId") REFERENCES "permit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_type_checklists" ADD CONSTRAINT "permit_type_checklists_permitTypeId_fkey" FOREIGN KEY ("permitTypeId") REFERENCES "permit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_cases" ADD CONSTRAINT "permit_cases_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_cases" ADD CONSTRAINT "permit_cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_cases" ADD CONSTRAINT "permit_cases_permitTypeId_fkey" FOREIGN KEY ("permitTypeId") REFERENCES "permit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_documents" ADD CONSTRAINT "permit_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_checklists" ADD CONSTRAINT "permit_checklists_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_checklists" ADD CONSTRAINT "permit_checklists_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_activities" ADD CONSTRAINT "permit_activities_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_comments" ADD CONSTRAINT "permit_comments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_comments" ADD CONSTRAINT "permit_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "permit_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_deadlines" ADD CONSTRAINT "permit_deadlines_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "permit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_relatedEntryId_fkey" FOREIGN KEY ("relatedEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_items" ADD CONSTRAINT "journal_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_items" ADD CONSTRAINT "journal_items_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_period_closes" ADD CONSTRAINT "fiscal_period_closes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_period_closes" ADD CONSTRAINT "fiscal_period_closes_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_documents" ADD CONSTRAINT "accounting_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_report_snapshots" ADD CONSTRAINT "financial_report_snapshots_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
