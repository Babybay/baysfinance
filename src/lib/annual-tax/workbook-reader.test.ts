import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { readAnnualTaxWorkbook, summarizeAnnualTaxWorkbook } from "./workbook-reader";

describe("workbook-reader", () => {
    it("parses a workbook end-to-end through the annual-tax reader", () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([
            ["NPWP", "Nama Perusahaan", "Tahun"],
            ["01.234.567.8-901.000", "PT Contoh Jaya", 2025],
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "Identitas Perusahaan");
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

        const parsed = readAnnualTaxWorkbook(buf);
        const summary = summarizeAnnualTaxWorkbook(parsed);

        expect(summary.sheetCount).toBe(1);
        expect(summary.sheets[0].sheetName).toBe("Identitas Perusahaan");
        expect(summary.sheets[0].rowCount).toBeGreaterThanOrEqual(2);
        expect(summary.sheets[0].columnCount).toBeGreaterThanOrEqual(3);
    });
});
