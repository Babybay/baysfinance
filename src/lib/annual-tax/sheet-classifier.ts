export type AnnualTaxSheetType =
    | "company_identity"
    | "spt_1771_main"
    | "spt_1771_attachment"
    | "financial_position"
    | "commercial_profit_loss"
    | "fiscal_reconciliation"
    | "tax_calculation"
    | "fiscal_loss_compensation"
    | "fixed_asset_depreciation"
    | "monthly_tax_recap"
    | "vat_reconciliation"
    | "vat_input"
    | "vat_output"
    | "export_document"
    | "withholding_tax"
    | "bank_cash_ledger"
    | "accounts_receivable"
    | "accounts_payable"
    | "tax_payable"
    | "payroll_bpjs"
    | "inventory"
    | "lease_contract"
    | "shareholders_dividends"
    | "affiliates"
    | "branch_segment"
    | "official_blank_form"
    | "unknown";

export interface SheetClassification {
    sheetName: string;
    normalizedName: string;
    type: AnnualTaxSheetType;
    confidence: number;
    reason: string;
}

interface Rule {
    type: AnnualTaxSheetType;
    confidence: number;
    reason: string;
    patterns: RegExp[];
}

const rules: Rule[] = [
    {
        type: "company_identity",
        confidence: 0.98,
        reason: "Company identity sheet used by SPT workbooks",
        patterns: [/^data$/],
    },
    {
        type: "spt_1771_main",
        confidence: 0.99,
        reason: "Main SPT 1771 form",
        patterns: [/^1771$/],
    },
    {
        type: "spt_1771_attachment",
        confidence: 0.98,
        reason: "SPT 1771 attachment",
        patterns: [/^1771\s*(i|ii|iii|iv|v|vi)$/],
    },
    {
        type: "official_blank_form",
        confidence: 0.82,
        reason: "Blank SPT attachment template",
        patterns: [/^induk$/, /^l\d+/, /^1l\s+l/, /^dagang$/, /^industri$/, /non\s+kualifikasi/],
    },
    {
        type: "financial_position",
        confidence: 0.92,
        reason: "Balance sheet / neraca schedule",
        patterns: [/\bneraca\b/, /\bnrc\b/, /balance\s+sheet/],
    },
    {
        type: "fiscal_reconciliation",
        confidence: 0.95,
        reason: "Commercial to fiscal P&L reconciliation",
        patterns: [/lr\s+fiskal/, /laba\s+rugi\s+fiscal/, /laba\s+rugi\s+fiskal/, /fiskal/],
    },
    {
        type: "tax_calculation",
        confidence: 0.9,
        reason: "Taxable income / PPh Badan calculation helper",
        patterns: [/^hit$/, /^hitung/, /perhitungan/],
    },
    {
        type: "fiscal_loss_compensation",
        confidence: 0.94,
        reason: "Fiscal loss compensation schedule",
        patterns: [/rugi\s+fiskal/, /kompensasi\s+kerugian/],
    },
    {
        type: "fixed_asset_depreciation",
        confidence: 0.94,
        reason: "Fixed asset depreciation or amortization schedule",
        patterns: [/penyusutan/, /amortisasi/, /fixed\s+asset/, /daft\.?pnyusutan/, /aset\s+tetap/],
    },
    {
        type: "monthly_tax_recap",
        confidence: 0.9,
        reason: "Monthly tax recap schedule",
        patterns: [/rekap.*pajak/, /pajak.*rekap/, /pph\s*25/],
    },
    {
        type: "vat_input",
        confidence: 0.95,
        reason: "VAT input tax invoice source list",
        patterns: [/faktur\s+masukan/],
    },
    {
        type: "vat_output",
        confidence: 0.95,
        reason: "VAT output tax invoice source list",
        patterns: [/faktur\s+keluaran/],
    },
    {
        type: "vat_reconciliation",
        confidence: 0.9,
        reason: "VAT monthly reconciliation",
        patterns: [/^ppn$/, /\bppn\b/],
    },
    {
        type: "export_document",
        confidence: 0.88,
        reason: "Export declaration / PEB schedule",
        patterns: [/^peb$/, /export/],
    },
    {
        type: "withholding_tax",
        confidence: 0.88,
        reason: "Withholding tax evidence or recap",
        patterns: [/pph\s*23/, /pph\s*26/, /bukti\s+potong/, /bupot/],
    },
    {
        type: "bank_cash_ledger",
        confidence: 0.86,
        reason: "Bank or cash ledger schedule",
        patterns: [/\bbank\b/, /\bkas\b/, /cashflow/, /arus\s+kas/, /permata/, /cimb/, /maybank/, /\bbca\b/],
    },
    {
        type: "accounts_receivable",
        confidence: 0.9,
        reason: "Accounts receivable schedule",
        patterns: [/piutang/, /receivable/],
    },
    {
        type: "accounts_payable",
        confidence: 0.9,
        reason: "Accounts payable schedule",
        patterns: [/utang\s+usaha/, /hutang\s+usaha/, /payable/],
    },
    {
        type: "tax_payable",
        confidence: 0.9,
        reason: "Tax payable schedule",
        patterns: [/utang\s+pajak/, /hutang\s+pajak/],
    },
    {
        type: "payroll_bpjs",
        confidence: 0.86,
        reason: "Payroll, employee tax, or BPJS schedule",
        patterns: [/gaji/, /payroll/, /bpjs/],
    },
    {
        type: "inventory",
        confidence: 0.86,
        reason: "Inventory or stock schedule",
        patterns: [/inventory/, /persediaan/, /bahan\s+packing/],
    },
    {
        type: "lease_contract",
        confidence: 0.86,
        reason: "Lease, rent, or contract schedule",
        patterns: [/kontrak/, /sewa/, /leasing/, /lease/, /rent/],
    },
    {
        type: "shareholders_dividends",
        confidence: 0.86,
        reason: "Dividend or shareholder support schedule",
        patterns: [/deviden/, /dividen/, /pemegang\s+saham/, /shareholder/],
    },
    {
        type: "affiliates",
        confidence: 0.82,
        reason: "Affiliate or related-party schedule",
        patterns: [/afiliasi/, /penyertaan/, /related\s+part/],
    },
    {
        type: "branch_segment",
        confidence: 0.72,
        reason: "Branch, outlet, or segment schedule",
        patterns: [/lacasetta/, /ecolodge/, /lombok/, /bali/, /pusat/, /cafe/, /resto/],
    },
    {
        type: "commercial_profit_loss",
        confidence: 0.78,
        reason: "Commercial profit/loss schedule",
        patterns: [/\blr\b/, /laba\s+rugi/, /profit.*loss/, /income\s+report/],
    },
];

export function normalizeSheetName(sheetName: string): string {
    return sheetName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

export function classifyAnnualTaxSheet(sheetName: string): SheetClassification {
    const normalizedName = normalizeSheetName(sheetName);

    for (const rule of rules) {
        if (rule.patterns.some((pattern) => pattern.test(normalizedName))) {
            return {
                sheetName,
                normalizedName,
                type: rule.type,
                confidence: rule.confidence,
                reason: rule.reason,
            };
        }
    }

    return {
        sheetName,
        normalizedName,
        type: "unknown",
        confidence: 0,
        reason: "No annual tax workbook classifier matched this sheet name",
    };
}

export function classifyAnnualTaxSheets(sheetNames: string[]): SheetClassification[] {
    return sheetNames.map(classifyAnnualTaxSheet);
}

export function summarizeSheetTypes(classifications: SheetClassification[]): Record<AnnualTaxSheetType, number> {
    const summary = {} as Record<AnnualTaxSheetType, number>;
    for (const classification of classifications) {
        summary[classification.type] = (summary[classification.type] ?? 0) + 1;
    }
    return summary;
}
