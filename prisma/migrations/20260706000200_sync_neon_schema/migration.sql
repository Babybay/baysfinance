-- AlterEnum
ALTER TYPE "JournalStatus" ADD VALUE 'Reversed';

-- AlterTable
ALTER TABLE "invoice_items" ALTER COLUMN "harga" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "jumlah" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "atasNama" TEXT,
ADD COLUMN "jabatanPenandaTangan" TEXT,
ADD COLUMN "namaBank" TEXT,
ADD COLUMN "nomorRekening" TEXT,
ADD COLUMN "penandaTangan" TEXT,
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "ppn" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN "invoiceId" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "jumlah" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "permit_cases" ALTER COLUMN "feeAmount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "recurring_invoice_items" ALTER COLUMN "harga" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "jumlah" SET DATA TYPE DECIMAL(18,2);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "nomorBukti" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "jumlah" DECIMAL(18,2) NOT NULL,
    "vendor" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "metodePembayaran" TEXT,
    "expenseAccountCode" TEXT NOT NULL,
    "bankAccountCode" TEXT NOT NULL DEFAULT '110',
    "pphType" TEXT,
    "pphRate" DECIMAL(8,4),
    "pphAmount" DECIMAL(18,2),
    "netAmount" DECIMAL(18,2),
    "catatan" TEXT,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_nomorBukti_key" ON "expenses"("nomorBukti");

-- CreateIndex
CREATE INDEX "expenses_clientId_idx" ON "expenses"("clientId");

-- CreateIndex
CREATE INDEX "expenses_clientId_tanggal_idx" ON "expenses"("clientId", "tanggal");

-- CreateIndex
CREATE INDEX "notification_logs_clientId_idx" ON "notification_logs"("clientId");

-- CreateIndex
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_type_referenceId_key" ON "notification_logs"("type", "referenceId");

-- CreateIndex
CREATE INDEX "invoices_status_jatuhTempo_idx" ON "invoices"("status", "jatuhTempo");

-- CreateIndex
CREATE INDEX "journal_entries_invoiceId_source_idx" ON "journal_entries"("invoiceId", "source");

-- CreateIndex
CREATE INDEX "tax_deadlines_status_tanggalBatas_idx" ON "tax_deadlines"("status", "tanggalBatas");

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
