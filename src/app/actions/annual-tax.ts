"use server";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
    AnnualTaxBatchStatus,
    AnnualTaxIssueSeverity,
    AnnualTaxIssueStatus,
    AnnualTaxSectionStatus,
    AnnualTaxSectionType,
    AnnualTaxSheetStatus,
    AnnualTaxSheetType as PrismaAnnualTaxSheetType,
    Prisma,
} from "@prisma/client";
import { assertCanAccessClient, getCurrentUser, handleAuthError } from "@/lib/auth-helpers";
import { readAnnualTaxWorkbook, summarizeAnnualTaxWorkbook } from "@/lib/annual-tax/workbook-reader";
import type { AnnualTaxSheetType } from "@/lib/annual-tax/sheet-classifier";

const SECTION_TITLES: Record<AnnualTaxSectionType, string> = {
    CompanyIdentity: "Company identity and SPT profile",
    FinancialStatements: "Financial statements",
    FiscalReconciliation: "Fiscal reconciliation",
    TaxCalculation1771: "SPT 1771 tax calculation",
    DepreciationFiscal: "Fiscal depreciation and amortization",
    FiscalLossCompensation: "Fiscal loss compensation",
    TaxCredits: "Tax credits",
    VatReconciliation: "VAT reconciliation",
    WithholdingTax: "Withholding tax evidence",
    PayrollBpjs: "Payroll and BPJS",
    AccountsReceivable: "Accounts receivable",
    AccountsPayable: "Accounts payable",
    Inventory: "Inventory",
    LeaseContracts: "Lease and contracts",
    ShareholdersDividends: "Shareholders and dividends",
    Affiliates: "Affiliates and related parties",
    BranchSegments: "Branch and segment schedules",
    AttachmentsChecklist: "SPT attachments checklist",
};

const CLASSIFIER_TO_PRISMA_SHEET_TYPE: Record<AnnualTaxSheetType, PrismaAnnualTaxSheetType> = {
    company_identity: PrismaAnnualTaxSheetType.CompanyIdentity,
    spt_1771_main: PrismaAnnualTaxSheetType.Spt1771Main,
    spt_1771_attachment: PrismaAnnualTaxSheetType.Spt1771Attachment,
    financial_position: PrismaAnnualTaxSheetType.FinancialPosition,
    commercial_profit_loss: PrismaAnnualTaxSheetType.CommercialProfitLoss,
    fiscal_reconciliation: PrismaAnnualTaxSheetType.FiscalReconciliation,
    tax_calculation: PrismaAnnualTaxSheetType.TaxCalculation,
    fiscal_loss_compensation: PrismaAnnualTaxSheetType.FiscalLossCompensation,
    fixed_asset_depreciation: PrismaAnnualTaxSheetType.FixedAssetDepreciation,
    monthly_tax_recap: PrismaAnnualTaxSheetType.MonthlyTaxRecap,
    vat_reconciliation: PrismaAnnualTaxSheetType.VatReconciliation,
    vat_input: PrismaAnnualTaxSheetType.VatInput,
    vat_output: PrismaAnnualTaxSheetType.VatOutput,
    export_document: PrismaAnnualTaxSheetType.ExportDocument,
    withholding_tax: PrismaAnnualTaxSheetType.WithholdingTax,
    bank_cash_ledger: PrismaAnnualTaxSheetType.BankCashLedger,
    accounts_receivable: PrismaAnnualTaxSheetType.AccountsReceivable,
    accounts_payable: PrismaAnnualTaxSheetType.AccountsPayable,
    tax_payable: PrismaAnnualTaxSheetType.TaxPayable,
    payroll_bpjs: PrismaAnnualTaxSheetType.PayrollBpjs,
    inventory: PrismaAnnualTaxSheetType.Inventory,
    lease_contract: PrismaAnnualTaxSheetType.LeaseContract,
    shareholders_dividends: PrismaAnnualTaxSheetType.ShareholdersDividends,
    affiliates: PrismaAnnualTaxSheetType.Affiliates,
    branch_segment: PrismaAnnualTaxSheetType.BranchSegment,
    official_blank_form: PrismaAnnualTaxSheetType.OfficialBlankForm,
    unknown: PrismaAnnualTaxSheetType.Unknown,
};

const SHEET_TYPE_TO_SECTION: Partial<Record<PrismaAnnualTaxSheetType, AnnualTaxSectionType>> = {
    [PrismaAnnualTaxSheetType.CompanyIdentity]: AnnualTaxSectionType.CompanyIdentity,
    [PrismaAnnualTaxSheetType.FinancialPosition]: AnnualTaxSectionType.FinancialStatements,
    [PrismaAnnualTaxSheetType.CommercialProfitLoss]: AnnualTaxSectionType.FinancialStatements,
    [PrismaAnnualTaxSheetType.FiscalReconciliation]: AnnualTaxSectionType.FiscalReconciliation,
    [PrismaAnnualTaxSheetType.TaxCalculation]: AnnualTaxSectionType.TaxCalculation1771,
    [PrismaAnnualTaxSheetType.FiscalLossCompensation]: AnnualTaxSectionType.FiscalLossCompensation,
    [PrismaAnnualTaxSheetType.FixedAssetDepreciation]: AnnualTaxSectionType.DepreciationFiscal,
    [PrismaAnnualTaxSheetType.MonthlyTaxRecap]: AnnualTaxSectionType.TaxCredits,
    [PrismaAnnualTaxSheetType.VatReconciliation]: AnnualTaxSectionType.VatReconciliation,
    [PrismaAnnualTaxSheetType.VatInput]: AnnualTaxSectionType.VatReconciliation,
    [PrismaAnnualTaxSheetType.VatOutput]: AnnualTaxSectionType.VatReconciliation,
    [PrismaAnnualTaxSheetType.ExportDocument]: AnnualTaxSectionType.VatReconciliation,
    [PrismaAnnualTaxSheetType.WithholdingTax]: AnnualTaxSectionType.WithholdingTax,
    [PrismaAnnualTaxSheetType.AccountsReceivable]: AnnualTaxSectionType.AccountsReceivable,
    [PrismaAnnualTaxSheetType.AccountsPayable]: AnnualTaxSectionType.AccountsPayable,
    [PrismaAnnualTaxSheetType.TaxPayable]: AnnualTaxSectionType.TaxCredits,
    [PrismaAnnualTaxSheetType.PayrollBpjs]: AnnualTaxSectionType.PayrollBpjs,
    [PrismaAnnualTaxSheetType.Inventory]: AnnualTaxSectionType.Inventory,
    [PrismaAnnualTaxSheetType.LeaseContract]: AnnualTaxSectionType.LeaseContracts,
    [PrismaAnnualTaxSheetType.ShareholdersDividends]: AnnualTaxSectionType.ShareholdersDividends,
    [PrismaAnnualTaxSheetType.Affiliates]: AnnualTaxSectionType.Affiliates,
    [PrismaAnnualTaxSheetType.BranchSegment]: AnnualTaxSectionType.BranchSegments,
    [PrismaAnnualTaxSheetType.Spt1771Main]: AnnualTaxSectionType.AttachmentsChecklist,
    [PrismaAnnualTaxSheetType.Spt1771Attachment]: AnnualTaxSectionType.AttachmentsChecklist,
};

export async function getAnnualTaxBatches(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const batches = await prisma.annualTaxBatch.findMany({
            where: { clientId, deletedAt: null },
            include: {
                _count: {
                    select: {
                        workbooks: true,
                        sections: true,
                        issues: { where: { status: AnnualTaxIssueStatus.Open } },
                        exports: true,
                    },
                },
            },
            orderBy: [{ taxYear: "desc" }, { createdAt: "desc" }],
        });

        return {
            success: true as const,
            data: batches.map((batch) => ({
                ...batch,
                createdAt: batch.createdAt.toISOString(),
                updatedAt: batch.updatedAt.toISOString(),
                approvedAt: batch.approvedAt?.toISOString() ?? null,
            })),
        };
    } catch (error) {
        console.error("getAnnualTaxBatches error:", error);
        return { ...handleAuthError(error), data: [] };
    }
}

export async function createAnnualTaxBatch(clientId: string, taxYear: number) {
    try {
        await assertCanAccessClient(clientId);
        const user = await getCurrentUser();

        if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
            return { success: false as const, error: "Tahun pajak tidak valid." };
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { nama: true, npwp: true },
        });
        if (!client) return { success: false as const, error: "Klien tidak ditemukan." };

        const batch = await prisma.$transaction(async (tx) => {
            const created = await tx.annualTaxBatch.upsert({
                where: { clientId_taxYear: { clientId, taxYear } },
                create: {
                    clientId,
                    taxYear,
                    companyName: client.nama,
                    npwp: client.npwp,
                    createdBy: user?.id,
                },
                update: {},
            });

            await tx.annualTaxSection.createMany({
                data: Object.entries(SECTION_TITLES).map(([sectionType, title]) => ({
                    batchId: created.id,
                    sectionType: sectionType as AnnualTaxSectionType,
                    title,
                    status: AnnualTaxSectionStatus.Missing,
                })),
                skipDuplicates: true,
            });

            return created;
        });

        return { success: true as const, data: { ...batch, createdAt: batch.createdAt.toISOString(), updatedAt: batch.updatedAt.toISOString() } };
    } catch (error) {
        console.error("createAnnualTaxBatch error:", error);
        return handleAuthError(error);
    }
}

export async function getAnnualTaxBatchDetail(batchId: string) {
    try {
        const batch = await prisma.annualTaxBatch.findUnique({
            where: { id: batchId },
            include: {
                client: { select: { id: true, nama: true, npwp: true } },
                sections: { orderBy: { sectionType: "asc" } },
                issues: { orderBy: [{ severity: "desc" }, { createdAt: "desc" }] },
                workbooks: {
                    include: {
                        sheets: { orderBy: [{ detectedType: "asc" }, { sheetName: "asc" }] },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!batch) return { success: false as const, error: "Batch SPT Tahunan tidak ditemukan.", data: null };

        await assertCanAccessClient(batch.clientId);

        return {
            success: true as const,
            data: {
                ...batch,
                createdAt: batch.createdAt.toISOString(),
                updatedAt: batch.updatedAt.toISOString(),
                approvedAt: batch.approvedAt?.toISOString() ?? null,
                workbooks: batch.workbooks.map((workbook) => ({
                    ...workbook,
                    createdAt: workbook.createdAt.toISOString(),
                    sheets: workbook.sheets.map((sheet) => ({
                        ...sheet,
                        confidence: Number(sheet.confidence),
                        createdAt: sheet.createdAt.toISOString(),
                    })),
                })),
                sections: batch.sections.map((section) => ({
                    ...section,
                    createdAt: section.createdAt.toISOString(),
                    updatedAt: section.updatedAt.toISOString(),
                    reviewedAt: section.reviewedAt?.toISOString() ?? null,
                })),
                issues: batch.issues.map((issue) => ({
                    ...issue,
                    createdAt: issue.createdAt.toISOString(),
                    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
                })),
            },
        };
    } catch (error) {
        console.error("getAnnualTaxBatchDetail error:", error);
        return { ...handleAuthError(error), data: null };
    }
}

export async function classifyAnnualTaxWorkbookUpload(batchId: string, formData: FormData) {
    try {
        const batch = await prisma.annualTaxBatch.findUnique({
            where: { id: batchId },
            select: { id: true, clientId: true },
        });
        if (!batch) return { success: false as const, error: "Batch SPT Tahunan tidak ditemukan." };
        await assertCanAccessClient(batch.clientId);

        const user = await getCurrentUser();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return { success: false as const, error: "File Excel tidak ditemukan." };
        }

        if (!/\.(xlsx|xls)$/i.test(file.name)) {
            return { success: false as const, error: "Format file harus .xlsx atau .xls." };
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return { success: false as const, error: "Ukuran file maksimal 10MB." };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length === 0) return { success: false as const, error: "File kosong." };

        const workbook = readAnnualTaxWorkbook(buffer);
        const summary = summarizeAnnualTaxWorkbook(workbook);
        const checksum = createHash("sha256").update(buffer).digest("hex");

        const workbookRecord = await prisma.$transaction(async (tx) => {
            const createdWorkbook = await tx.annualTaxWorkbook.create({
                data: {
                    batchId,
                    fileName: file.name,
                    fileSize: buffer.length,
                    checksum,
                    sheetCount: summary.sheetCount,
                    uploadedBy: user?.id ?? "system",
                },
            });

            const sheets = await Promise.all(summary.sheets.map((sheet) => {
                const detectedType = CLASSIFIER_TO_PRISMA_SHEET_TYPE[sheet.classification.type];
                return tx.annualTaxSheet.create({
                    data: {
                        workbookId: createdWorkbook.id,
                        sheetName: sheet.sheetName,
                        normalizedName: sheet.classification.normalizedName,
                        detectedType,
                        confidence: new Prisma.Decimal(sheet.classification.confidence),
                        rangeRef: sheet.rangeRef,
                        rowCount: sheet.rowCount,
                        columnCount: sheet.columnCount,
                        cellCount: sheet.cellCount,
                        status: sheet.classification.type === "unknown"
                            ? AnnualTaxSheetStatus.NeedsReview
                            : AnnualTaxSheetStatus.Detected,
                        sampleRows: sheet.sampleRows.length > 0 ? sheet.sampleRows : undefined,
                        metadata: { reason: sheet.classification.reason },
                    },
                });
            }));

            const detectedSections = new Set<AnnualTaxSectionType>();
            for (const sheet of sheets) {
                const sectionType = SHEET_TYPE_TO_SECTION[sheet.detectedType];
                if (sectionType) detectedSections.add(sectionType);
            }

            for (const sectionType of detectedSections) {
                await tx.annualTaxSection.upsert({
                    where: { batchId_sectionType: { batchId, sectionType } },
                    create: {
                        batchId,
                        sectionType,
                        title: SECTION_TITLES[sectionType],
                        status: AnnualTaxSectionStatus.NeedsReview,
                    },
                    update: { status: AnnualTaxSectionStatus.NeedsReview },
                });
            }

            const unknownCount = sheets.filter((sheet) => sheet.detectedType === PrismaAnnualTaxSheetType.Unknown).length;
            if (unknownCount > 0) {
                await tx.annualTaxValidationIssue.create({
                    data: {
                        batchId,
                        severity: AnnualTaxIssueSeverity.Warning,
                        code: "UNCLASSIFIED_SHEETS",
                        message: `${unknownCount} sheet belum bisa diklasifikasikan otomatis.`,
                        actualValue: String(unknownCount),
                        status: AnnualTaxIssueStatus.Open,
                    },
                });
            }

            await tx.annualTaxBatch.update({
                where: { id: batchId },
                data: { status: AnnualTaxBatchStatus.Parsed },
            });

            return { ...createdWorkbook, sheets };
        });

        return {
            success: true as const,
            data: {
                ...workbookRecord,
                createdAt: workbookRecord.createdAt.toISOString(),
                sheets: workbookRecord.sheets.map((sheet) => ({
                    ...sheet,
                    confidence: Number(sheet.confidence),
                    createdAt: sheet.createdAt.toISOString(),
                })),
            },
        };
    } catch (error) {
        console.error("classifyAnnualTaxWorkbookUpload error:", error);
        return handleAuthError(error);
    }
}
