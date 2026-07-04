/**
 * One-off audit: run the real client SPT workbooks in docs/ through the
 * annual-tax classifier pipeline and report coverage.
 * Run: npx tsx scripts/audit-docs-workbooks.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readAnnualTaxWorkbook, summarizeAnnualTaxWorkbook } from "../src/lib/annual-tax/workbook-reader";

const DOCS = join(__dirname, "..", "docs");
const files = readdirSync(DOCS).filter((f) => /\.(xlsx|xls)$/i.test(f));

for (const file of files) {
    const buf = readFileSync(join(DOCS, file));
    const sizeMB = (buf.length / 1024 / 1024).toFixed(1);
    try {
        const wb = readAnnualTaxWorkbook(buf);
        const summary = summarizeAnnualTaxWorkbook(wb);
        const unknown = summary.sheets.filter((s) => s.classification.type === "unknown");
        const known = summary.sheets.length - unknown.length;
        console.log(`\n=== ${file} (${sizeMB}MB) ===`);
        console.log(`sheets: ${summary.sheetCount}, classified: ${known}, unknown: ${unknown.length}`);
        const byType: Record<string, number> = {};
        for (const s of summary.sheets) byType[s.classification.type] = (byType[s.classification.type] ?? 0) + 1;
        console.log("types:", JSON.stringify(byType));
        if (unknown.length > 0) {
            console.log("UNKNOWN sheets:", unknown.map((s) => s.sheetName).join(" | "));
        }
        const empty = summary.sheets.filter((s) => s.cellCount === 0);
        if (empty.length > 0) console.log(`empty sheets: ${empty.length}`);
    } catch (err) {
        console.log(`\n=== ${file} (${sizeMB}MB) ===`);
        console.log("PARSE FAILED:", (err as Error).message);
    }
}
