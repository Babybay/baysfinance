# Annual Corporate Tax Pack Implementation Plan

Date: 2026-06-21
Project: Bay'sConsult / saas-consulting
Source review: five annual corporate tax Excel workbooks in `docs/`

## Objective

Build a production-grade **Annual Corporate Tax Pack** module that replaces the current SPT Tahunan Badan Excel workflow with a traceable web workflow.

The module must ingest annual Excel workbooks, classify sheets, extract financial and tax schedules, map values into structured sections, validate accounting/tax tie-outs, and export an internal review pack first. Final SPT 1771 form export comes after the review workflow is stable.

## Current Website Baseline

The app already has:

- Agency and sub-account model through `Organisation` and `Client`
- Chart of accounts, journal entries, general ledger, neraca, neraca lajur
- Fixed asset import support through `FixedAsset`
- Financial report snapshots through `FinancialReportSnapshot`
- Invoice/payment auto-journals
- Document upload/OCR and accounting import flows
- A placeholder annual tax page at `src/app/dashboard/accounting/annual-tax`

The app does not yet have a structured annual SPT Badan production workflow.

## Excel Workflow Coverage Found

The reviewed workbooks contain these repeated domains:

- SPT 1771 main form and attachments: `1771`, `1771 I`, `1771 II`, `1771 III`, `1771 IV`, `1771 V`, `1771 VI`
- Company identity: NPWP, KPP, taxpayer name, tax year
- Balance sheet: `neraca`, `NRC`, branch/entity neraca
- Commercial and fiscal profit/loss: `LR FISKAL`, `Laba Rugi Fiscal`, `Hit`
- Fiscal corrections: positive and negative corrections
- Fiscal loss compensation: `rugi fiskal`
- Fixed asset and depreciation schedules: `penyusutan`, `amortisasi & penyusutan`, `daft.pnyusutan`
- Monthly tax recaps: PPh 21, PPh 23, PPh 25, PPh 26, BPJS
- VAT: `PPN`, `Faktur masukan`, `Faktur Keluaran`, `PEB`
- AR/AP schedules: `Piutang`, `utang usaha`, `utang pajak`
- Bank/cash journals: `BANK`, `Bank USD`, `Bank IDR`, `kas office`, `kas accounting`
- Inventory, lease, contract, dividend, shareholder, and affiliate schedules
- Multi-entity or branch breakdowns for groups such as Pusat, Bali, Lombok, Lacasetta, Ecolodge

## Product Principle

Do not recreate every Excel sheet as a web page.

Use workbooks as source evidence. The web app should present a section-based review workflow with traceability back to workbook, sheet, row, and cell.

## Target Workflow

1. Staff selects a sub-account/company and tax year.
2. Staff uploads one or more annual workbooks.
3. System stores the original files and extracts workbook metadata.
4. System classifies each sheet into tax/accounting domains.
5. System extracts candidate tables, values, and evidence coordinates.
6. Staff maps or confirms each section.
7. System validates accounting and tax tie-outs.
8. Staff resolves exceptions or marks items not applicable.
9. System locks an approved review pack.
10. System exports review workbook/PDF.
11. Later phase exports official-style SPT 1771 forms.

## Data Model Additions

Add these Prisma models.

### AnnualTaxBatch

Purpose: one annual tax package per client and tax year.

Fields:

- `id`
- `clientId`
- `taxYear`
- `status`: `Draft`, `Parsed`, `Mapped`, `Review`, `Approved`, `Exported`, `Archived`
- `companyName`
- `npwp`
- `kpp`
- `createdBy`
- `approvedBy`
- `approvedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

Constraints:

- Unique active batch by `clientId + taxYear`
- Index by `clientId`, `taxYear`, `status`

### AnnualTaxWorkbook

Purpose: uploaded source workbook metadata.

Fields:

- `id`
- `batchId`
- `fileName`
- `fileUrl`
- `fileSize`
- `checksum`
- `sheetCount`
- `parserVersion`
- `uploadedBy`
- `createdAt`

### AnnualTaxSheet

Purpose: classified worksheet inventory.

Fields:

- `id`
- `workbookId`
- `sheetName`
- `normalizedName`
- `detectedType`
- `confidence`
- `rangeRef`
- `rowCount`
- `cellCount`
- `status`: `Detected`, `Ignored`, `Mapped`, `NeedsReview`
- `metadata` JSON

### AnnualTaxExtractedValue

Purpose: evidence-backed extracted values.

Fields:

- `id`
- `sheetId`
- `section`
- `fieldKey`
- `label`
- `rawValue`
- `normalizedValue`
- `valueType`: `Text`, `Number`, `Date`, `Boolean`
- `cellRef`
- `rowNumber`
- `columnNumber`
- `confidence`
- `metadata` JSON

### AnnualTaxSection

Purpose: staff-reviewable sections independent from source sheets.

Fields:

- `id`
- `batchId`
- `sectionType`
- `status`: `Missing`, `Draft`, `NeedsReview`, `Reviewed`, `Approved`, `NotApplicable`
- `title`
- `data` JSON
- `reviewedBy`
- `reviewedAt`
- `notes`

Section types:

- `CompanyIdentity`
- `FinancialStatements`
- `FiscalReconciliation`
- `TaxCalculation1771`
- `DepreciationFiscal`
- `FiscalLossCompensation`
- `TaxCredits`
- `VatReconciliation`
- `WithholdingTax`
- `PayrollBpjs`
- `AccountsReceivable`
- `AccountsPayable`
- `Inventory`
- `LeaseContracts`
- `ShareholdersDividends`
- `Affiliates`
- `BranchSegments`
- `AttachmentsChecklist`

### AnnualTaxValidationIssue

Purpose: validation exceptions and audit trail.

Fields:

- `id`
- `batchId`
- `sectionId`
- `severity`: `Info`, `Warning`, `Error`, `Blocking`
- `code`
- `message`
- `expectedValue`
- `actualValue`
- `sourceEvidence` JSON
- `status`: `Open`, `Resolved`, `AcceptedRisk`, `NotApplicable`
- `resolvedBy`
- `resolvedAt`
- `createdAt`

### AnnualTaxExport

Purpose: output tracking.

Fields:

- `id`
- `batchId`
- `exportType`: `ReviewWorkbook`, `ReviewPdf`, `SPT1771Workbook`
- `fileUrl`
- `generatedBy`
- `generatedAt`
- `metadata` JSON

## Parser Architecture

Create a parser module under:

`src/lib/annual-tax/`

Files:

- `workbook-reader.ts`
- `sheet-classifier.ts`
- `table-detector.ts`
- `extractors/company-identity.ts`
- `extractors/financial-statements.ts`
- `extractors/fiscal-reconciliation.ts`
- `extractors/tax-recaps.ts`
- `extractors/vat.ts`
- `extractors/fixed-assets.ts`
- `extractors/ar-ap.ts`
- `validators.ts`
- `export-review-workbook.ts`

Use existing `xlsx` dependency for `.xls` and `.xlsx` reading. Use `exceljs` for styled export.

## Sheet Classifier

Implement alias-based classification first.

High-confidence aliases:

- Company identity: `Data`
- SPT forms: `1771`, `1771 I`, `1771 II`, `1771 III`, `1771 IV`, `1771 V`, `1771 VI`
- Financial statements: `neraca`, `balance sheet`, `NRC`
- Fiscal P&L: `LR FISKAL`, `Laba Rugi Fiscal`, `LABA RUGI FISKAL`, `Hit`
- Depreciation: `penyusutan`, `amortisasi`, `daft.pnyusutan`, `fixed asset`
- VAT: `PPN`, `Faktur masukan`, `Faktur Keluaran`, `PEB`
- Tax recaps: `Rekap Pajak`, `Pph 23 masukan`, `Rekap PPH 26`
- Bank/cash: `BANK`, `Bank USD`, `Bank IDR`, `kas office`, `kas accounting`
- AR/AP: `Piutang`, `utang usaha`, `utang pajak`
- Inventory: `inventory`, `bahan packing`
- Lease/contracts: `Kontrak`, `Rekap Sewa`, `leasing`
- Payroll/BPJS: `rekap gaji`, `BPJS`

## Validation Rules

### Accounting Rules

- Balance sheet assets must equal liabilities plus equity plus current year result.
- Neraca lajur totals must tie to annual tax financial statement section.
- Revenue and expenses in fiscal reconciliation must tie to commercial P&L.
- AR and AP schedules must tie to balance sheet control accounts.
- Bank/cash support schedules must tie to cash/bank accounts.
- Fixed asset cost and accumulated depreciation must tie to balance sheet.

### Tax Rules

- Commercial net income plus positive correction minus negative correction equals fiscal net income.
- Fiscal net income less fiscal loss compensation equals taxable income.
- PPh Badan calculation must match configured corporate tax rate logic.
- PPh 25 credits must tie to monthly recap and final tax calculation.
- PPh 23 and PPh 26 credits must have bupot number/date where applicable.
- PPN output minus PPN input must tie to PPN recap.
- Faktur Masukan/Keluaran totals must tie to VAT reconciliation.
- PPh Final and non-taxable income must map to 1771 IV.

### Completeness Rules

- Required 1771 sections must be present, approved, or marked not applicable.
- Shareholder/dividend section must be complete for 1771 V.
- Affiliate/related-party section must be complete or marked not applicable for 1771 VI.
- Depreciation schedule must be present if fixed asset balances exist.
- Fiscal loss schedule must be present if prior losses or compensation are claimed.

## UI Pages

Create routes under:

`src/app/dashboard/accounting/annual-tax/`

Pages/components:

- `page.tsx`: annual tax workspace landing
- `batches/page.tsx`: list annual tax batches by client/year
- `[batchId]/page.tsx`: batch overview and progress
- `[batchId]/workbooks/page.tsx`: uploaded files and sheet classification
- `[batchId]/sections/page.tsx`: review sections
- `[batchId]/sections/[sectionType]/page.tsx`: section editor/reviewer
- `[batchId]/validations/page.tsx`: validation issues
- `[batchId]/exports/page.tsx`: generated review packs and final exports

Keep the existing `AnnualTaxView` as the landing/dashboard component, but replace static content with real batch data once server actions exist.

## Server Actions / API

Create:

- `src/app/actions/annual-tax.ts`

Actions:

- `getAnnualTaxBatches(clientId)`
- `createAnnualTaxBatch(clientId, taxYear)`
- `uploadAnnualTaxWorkbook(batchId, file)`
- `parseAnnualTaxWorkbook(workbookId)`
- `getAnnualTaxBatchDetail(batchId)`
- `getAnnualTaxSections(batchId)`
- `updateAnnualTaxSection(sectionId, data, status)`
- `runAnnualTaxValidations(batchId)`
- `resolveAnnualTaxIssue(issueId, status, notes)`
- `approveAnnualTaxBatch(batchId)`
- `exportAnnualTaxReviewWorkbook(batchId)`

For file upload, reuse current S3/MinIO helper if available. If upload is not ready for this module, store metadata first and parse directly from the request buffer.

## Export Strategy

Phase 1 export:

- Internal review workbook
- One tab per section
- Source evidence columns: workbook, sheet, cell, row
- Validation issue tab
- Review status tab

Phase 2 export:

- SPT 1771-style workbook
- Fill mapped values into templates for 1771, 1771 I-VI, and relevant attachments

Phase 3 export:

- PDF management review pack
- Signed approval summary

## Implementation Phases

### Phase 1: Foundation

Deliverables:

- Prisma models and migration
- Server action skeletons
- Batch list/detail pages
- Workbook upload metadata
- Sheet classifier
- Parser summary view

Acceptance criteria:

- Staff can create a tax batch for one client/year.
- Staff can upload a workbook and see sheet names, detected types, confidence, and range/cell counts.
- Original workbook remains traceable.

### Phase 2: Core Extraction

Deliverables:

- Extract company identity
- Extract financial statements
- Extract fiscal reconciliation
- Extract depreciation/fixed assets
- Extract tax recaps and VAT summary
- Store extracted values with source coordinates

Acceptance criteria:

- For Sukmasari/Kristal/Totem workbooks, the app can classify major sheets and extract key annual totals.
- Extracted values can be reviewed by section.

### Phase 3: Validation

Deliverables:

- Validation engine
- Validation issue page
- Exception workflow
- Accept-risk and not-applicable statuses

Acceptance criteria:

- App flags missing SPT attachments, missing COA tie-outs, unbalanced statements, fiscal reconciliation mismatch, and VAT/tax recap mismatch.

### Phase 4: Review Pack Export

Deliverables:

- Styled Excel review workbook export
- Section status and validation issue export
- Evidence-backed extracted values

Acceptance criteria:

- Staff can export a usable annual tax review workbook without opening the original source files.

### Phase 5: Official SPT Form Output

Deliverables:

- 1771 form template mapping
- Attachment I-VI mapping
- Special attachment mapping for depreciation and fiscal loss compensation

Acceptance criteria:

- Approved annual tax batch can produce a 1771-style workbook for final staff review.

## First Code Execution Order

1. Add Prisma models and migration.
2. Add parser/classifier module with tests using workbook sheet names.
3. Add annual tax server actions.
4. Replace static annual tax landing with real batch-aware UI.
5. Add workbook classification page.
6. Add extraction for `Data`, `LR FISKAL`, `neraca`, `PPN`, `Rekap Pajak`, and depreciation sheets.
7. Add validations.
8. Add review workbook export.

## Audit Risks

- The source workbooks have inconsistent sheet names and layout.
- Some sheets use merged cells and presentation formatting, not clean tables.
- Some workbooks contain multi-entity data inside one legal taxpayer.
- Legacy `.xls` parsing may lose styles; use values for extraction and keep original files for evidence.
- SPT 1771 official formats may change; keep template mapping versioned.

## Definition of Done

The module is considered useful when a staff member can:

1. Select a client and tax year.
2. Upload the annual workbook.
3. See detected sheets and confidence.
4. Review core SPT sections.
5. See validation exceptions.
6. Export a structured review workbook.
7. Trace every important amount back to the original workbook/sheet/cell.

