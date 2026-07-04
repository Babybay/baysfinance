-- CreateEnum
CREATE TYPE "AnnualTaxBatchStatus" AS ENUM ('Draft', 'Parsed', 'Mapped', 'Review', 'Approved', 'Exported', 'Archived');

-- CreateEnum
CREATE TYPE "AnnualTaxSheetStatus" AS ENUM ('Detected', 'Ignored', 'Mapped', 'NeedsReview');

-- CreateEnum
CREATE TYPE "AnnualTaxSheetType" AS ENUM ('CompanyIdentity', 'Spt1771Main', 'Spt1771Attachment', 'FinancialPosition', 'CommercialProfitLoss', 'FiscalReconciliation', 'TaxCalculation', 'FiscalLossCompensation', 'FixedAssetDepreciation', 'MonthlyTaxRecap', 'VatReconciliation', 'VatInput', 'VatOutput', 'ExportDocument', 'WithholdingTax', 'BankCashLedger', 'AccountsReceivable', 'AccountsPayable', 'TaxPayable', 'PayrollBpjs', 'Inventory', 'LeaseContract', 'ShareholdersDividends', 'Affiliates', 'BranchSegment', 'OfficialBlankForm', 'Unknown');

-- CreateEnum
CREATE TYPE "AnnualTaxSectionType" AS ENUM ('CompanyIdentity', 'FinancialStatements', 'FiscalReconciliation', 'TaxCalculation1771', 'DepreciationFiscal', 'FiscalLossCompensation', 'TaxCredits', 'VatReconciliation', 'WithholdingTax', 'PayrollBpjs', 'AccountsReceivable', 'AccountsPayable', 'Inventory', 'LeaseContracts', 'ShareholdersDividends', 'Affiliates', 'BranchSegments', 'AttachmentsChecklist');

-- CreateEnum
CREATE TYPE "AnnualTaxSectionStatus" AS ENUM ('Missing', 'Draft', 'NeedsReview', 'Reviewed', 'Approved', 'NotApplicable');

-- CreateEnum
CREATE TYPE "AnnualTaxValueType" AS ENUM ('Text', 'Number', 'Date', 'Boolean');

-- CreateEnum
CREATE TYPE "AnnualTaxIssueSeverity" AS ENUM ('Info', 'Warning', 'Error', 'Blocking');

-- CreateEnum
CREATE TYPE "AnnualTaxIssueStatus" AS ENUM ('Open', 'Resolved', 'AcceptedRisk', 'NotApplicable');

-- CreateEnum
CREATE TYPE "AnnualTaxExportType" AS ENUM ('ReviewWorkbook', 'ReviewPdf', 'Spt1771Workbook');

-- CreateTable
CREATE TABLE "annual_tax_batches" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "status" "AnnualTaxBatchStatus" NOT NULL DEFAULT 'Draft',
    "companyName" TEXT,
    "npwp" TEXT,
    "kpp" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "annual_tax_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_workbooks" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "sheetCount" INTEGER NOT NULL DEFAULT 0,
    "parserVersion" TEXT NOT NULL DEFAULT 'annual-tax-v1',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_tax_workbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_sheets" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "detectedType" "AnnualTaxSheetType" NOT NULL,
    "confidence" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "rangeRef" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "columnCount" INTEGER NOT NULL DEFAULT 0,
    "cellCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AnnualTaxSheetStatus" NOT NULL DEFAULT 'Detected',
    "sampleRows" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_tax_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_extracted_values" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "section" "AnnualTaxSectionType" NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rawValue" TEXT,
    "normalizedValue" TEXT,
    "valueType" "AnnualTaxValueType" NOT NULL DEFAULT 'Text',
    "cellRef" TEXT,
    "rowNumber" INTEGER,
    "columnNumber" INTEGER,
    "confidence" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_tax_extracted_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_sections" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sectionType" "AnnualTaxSectionType" NOT NULL,
    "status" "AnnualTaxSectionStatus" NOT NULL DEFAULT 'Missing',
    "title" TEXT NOT NULL,
    "data" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_tax_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_validation_issues" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sectionId" TEXT,
    "severity" "AnnualTaxIssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "sourceEvidence" JSONB,
    "status" "AnnualTaxIssueStatus" NOT NULL DEFAULT 'Open',
    "resolutionNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_tax_validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_tax_exports" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "exportType" "AnnualTaxExportType" NOT NULL,
    "fileUrl" TEXT,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "annual_tax_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "annual_tax_batches_clientId_taxYear_key" ON "annual_tax_batches"("clientId", "taxYear");

-- CreateIndex
CREATE INDEX "annual_tax_batches_clientId_taxYear_status_idx" ON "annual_tax_batches"("clientId", "taxYear", "status");

-- CreateIndex
CREATE INDEX "annual_tax_workbooks_batchId_idx" ON "annual_tax_workbooks"("batchId");

-- CreateIndex
CREATE INDEX "annual_tax_sheets_workbookId_idx" ON "annual_tax_sheets"("workbookId");

-- CreateIndex
CREATE INDEX "annual_tax_sheets_detectedType_status_idx" ON "annual_tax_sheets"("detectedType", "status");

-- CreateIndex
CREATE INDEX "annual_tax_extracted_values_sheetId_section_idx" ON "annual_tax_extracted_values"("sheetId", "section");

-- CreateIndex
CREATE INDEX "annual_tax_extracted_values_fieldKey_idx" ON "annual_tax_extracted_values"("fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "annual_tax_sections_batchId_sectionType_key" ON "annual_tax_sections"("batchId", "sectionType");

-- CreateIndex
CREATE INDEX "annual_tax_sections_batchId_status_idx" ON "annual_tax_sections"("batchId", "status");

-- CreateIndex
CREATE INDEX "annual_tax_validation_issues_batchId_status_severity_idx" ON "annual_tax_validation_issues"("batchId", "status", "severity");

-- CreateIndex
CREATE INDEX "annual_tax_validation_issues_sectionId_idx" ON "annual_tax_validation_issues"("sectionId");

-- CreateIndex
CREATE INDEX "annual_tax_exports_batchId_exportType_idx" ON "annual_tax_exports"("batchId", "exportType");

-- AddForeignKey
ALTER TABLE "annual_tax_batches" ADD CONSTRAINT "annual_tax_batches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_workbooks" ADD CONSTRAINT "annual_tax_workbooks_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "annual_tax_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_sheets" ADD CONSTRAINT "annual_tax_sheets_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "annual_tax_workbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_extracted_values" ADD CONSTRAINT "annual_tax_extracted_values_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "annual_tax_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_sections" ADD CONSTRAINT "annual_tax_sections_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "annual_tax_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_validation_issues" ADD CONSTRAINT "annual_tax_validation_issues_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "annual_tax_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_validation_issues" ADD CONSTRAINT "annual_tax_validation_issues_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "annual_tax_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_tax_exports" ADD CONSTRAINT "annual_tax_exports_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "annual_tax_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
