import { describe, expect, it } from "vitest";
import {
    classifyAnnualTaxSheet,
    classifyAnnualTaxSheets,
    summarizeSheetTypes,
} from "./sheet-classifier";

describe("annual tax sheet classifier", () => {
    it("classifies SPT 1771 forms", () => {
        expect(classifyAnnualTaxSheet("1771").type).toBe("spt_1771_main");
        expect(classifyAnnualTaxSheet("1771 I").type).toBe("spt_1771_attachment");
        expect(classifyAnnualTaxSheet("1771 VI").type).toBe("spt_1771_attachment");
    });

    it("classifies financial statements and fiscal reconciliation sheets", () => {
        expect(classifyAnnualTaxSheet("neraca").type).toBe("financial_position");
        expect(classifyAnnualTaxSheet("NRC Dayu").type).toBe("financial_position");
        expect(classifyAnnualTaxSheet("LR FISKAL").type).toBe("fiscal_reconciliation");
        expect(classifyAnnualTaxSheet("Laba Rugi Fiscal").type).toBe("fiscal_reconciliation");
        expect(classifyAnnualTaxSheet("Hit").type).toBe("tax_calculation");
    });

    it("classifies tax, VAT, and withholding schedules", () => {
        expect(classifyAnnualTaxSheet("Rekap Pajak Totem All").type).toBe("monthly_tax_recap");
        expect(classifyAnnualTaxSheet("PPN").type).toBe("vat_reconciliation");
        expect(classifyAnnualTaxSheet("Faktur masukan").type).toBe("vat_input");
        expect(classifyAnnualTaxSheet("Faktur Keluaran").type).toBe("vat_output");
        expect(classifyAnnualTaxSheet("Rekap PPH 26").type).toBe("withholding_tax");
        expect(classifyAnnualTaxSheet("Pph 23 masukan").type).toBe("withholding_tax");
    });

    it("classifies supporting accounting workpapers", () => {
        expect(classifyAnnualTaxSheet("BANK EDIT").type).toBe("bank_cash_ledger");
        expect(classifyAnnualTaxSheet("kas accounting").type).toBe("bank_cash_ledger");
        expect(classifyAnnualTaxSheet("Piutang").type).toBe("accounts_receivable");
        expect(classifyAnnualTaxSheet("utang usaha").type).toBe("accounts_payable");
        expect(classifyAnnualTaxSheet("utang pajak").type).toBe("tax_payable");
        expect(classifyAnnualTaxSheet("rekap gaji").type).toBe("payroll_bpjs");
        expect(classifyAnnualTaxSheet("inventory ficx").type).toBe("inventory");
        expect(classifyAnnualTaxSheet("Rekap Sewa").type).toBe("lease_contract");
    });

    it("summarizes classified workbook sheets", () => {
        const classifications = classifyAnnualTaxSheets([
            "Data",
            "1771",
            "1771 I",
            "neraca",
            "LR FISKAL",
            "PPN",
            "Faktur masukan",
            "Faktur Keluaran",
            "Piutang",
            "utang usaha",
        ]);

        const summary = summarizeSheetTypes(classifications);

        expect(summary.company_identity).toBe(1);
        expect(summary.spt_1771_main).toBe(1);
        expect(summary.spt_1771_attachment).toBe(1);
        expect(summary.financial_position).toBe(1);
        expect(summary.fiscal_reconciliation).toBe(1);
        expect(summary.vat_reconciliation).toBe(1);
        expect(summary.vat_input).toBe(1);
        expect(summary.vat_output).toBe(1);
        expect(summary.accounts_receivable).toBe(1);
        expect(summary.accounts_payable).toBe(1);
    });
});
