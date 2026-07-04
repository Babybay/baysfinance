import * as XLSX from "xlsx";
import {
    classifyAnnualTaxSheets,
    summarizeSheetTypes,
    type AnnualTaxSheetType,
    type SheetClassification,
} from "./sheet-classifier";

export interface AnnualTaxWorkbookSheetSummary {
    sheetName: string;
    rangeRef: string | null;
    rowCount: number;
    columnCount: number;
    cellCount: number;
    classification: SheetClassification;
    sampleRows: string[][];
}

export interface AnnualTaxWorkbookSummary {
    sheetCount: number;
    sheets: AnnualTaxWorkbookSheetSummary[];
    typeSummary: Record<AnnualTaxSheetType, number>;
}

export function readAnnualTaxWorkbook(buffer: Buffer): XLSX.WorkBook {
    return XLSX.read(buffer, {
        type: "buffer",
        cellDates: false,
        dense: false,
    });
}

export function summarizeAnnualTaxWorkbook(workbook: XLSX.WorkBook): AnnualTaxWorkbookSummary {
    const classifications = classifyAnnualTaxSheets(workbook.SheetNames);
    const classificationByName = new Map(classifications.map((item) => [item.sheetName, item]));

    const sheets = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rangeRef = worksheet["!ref"] ?? null;
        const range = rangeRef ? XLSX.utils.decode_range(rangeRef) : null;
        const rowCount = range ? range.e.r - range.s.r + 1 : 0;
        const columnCount = range ? range.e.c - range.s.c + 1 : 0;
        const cellCount = Object.keys(worksheet).filter((key) => !key.startsWith("!")).length;

        return {
            sheetName,
            rangeRef,
            rowCount,
            columnCount,
            cellCount,
            classification: classificationByName.get(sheetName) ?? classifications[0],
            sampleRows: collectSampleRows(worksheet, range),
        };
    });

    return {
        sheetCount: workbook.SheetNames.length,
        sheets,
        typeSummary: summarizeSheetTypes(classifications),
    };
}

function collectSampleRows(worksheet: XLSX.WorkSheet, range: XLSX.Range | null): string[][] {
    if (!range) return [];

    const rows: string[][] = [];
    const maxRow = Math.min(range.e.r, range.s.r + 80);
    const maxCol = Math.min(range.e.c, range.s.c + 15);

    for (let row = range.s.r; row <= maxRow && rows.length < 5; row++) {
        const values: string[] = [];
        for (let column = range.s.c; column <= maxCol; column++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
            const value = cell ? String(cell.w ?? cell.v ?? "").trim() : "";
            if (value) values.push(value);
        }
        if (values.length > 0) rows.push(values);
    }

    return rows;
}
