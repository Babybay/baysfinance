import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
    getNeracaLajur,
    type NLSection,
    type NLSubsection,
} from "@/app/actions/accounting/neraca-lajur";
import { format } from "date-fns";

function fmtRp(amount: number): string {
    if (amount === 0) return " - ";
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(abs);
    if (amount < 0) return `(Rp ${formatted})`;
    return `Rp ${formatted}`;
}

function fmtDate(iso: string): string {
    return format(new Date(iso), "dd/MM/yyyy");
}

const HEADER_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF6FF" },
};

const SECTION_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD6E4F0" },
};

const SUBSECTION_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FE" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
};

const COL_COUNT = 4; // Kode, Nama Akun, Debit, Kredit (or just Code, Name, Balance for NL)

/**
 * Writes an NLSection (ASET, KEWAJIBAN DAN MODAL, or LABA RUGI) to the worksheet.
 * Returns the next available row number.
 */
function addSection(
    ws: ExcelJS.Worksheet,
    section: NLSection,
    startRow: number
): number {
    let row = startRow;

    // Section header row
    const sectionRow = ws.getRow(row);
    sectionRow.getCell(1).value = section.label;
    sectionRow.getCell(1).font = { bold: true, size: 11 };
    sectionRow.getCell(1).fill = SECTION_FILL;
    ws.mergeCells(row, 1, row, COL_COUNT);
    for (let c = 1; c <= COL_COUNT; c++) {
        sectionRow.getCell(c).border = BORDER_THIN;
        sectionRow.getCell(c).fill = SECTION_FILL;
    }
    row++;

    // Subsections
    for (const sub of section.subsections) {
        row = addSubsection(ws, sub, row);
    }

    // Section total row
    const totalRow = ws.getRow(row);
    totalRow.getCell(1).value = `Total ${section.label}`;
    totalRow.getCell(1).font = { bold: true, size: 10 };
    ws.mergeCells(row, 1, row, 2);
    totalRow.getCell(3).value = fmtRp(section.total);
    totalRow.getCell(3).alignment = { horizontal: "right" };
    totalRow.getCell(3).font = { bold: true, size: 10 };
    for (let c = 1; c <= COL_COUNT; c++) {
        totalRow.getCell(c).border = {
            top: { style: "double" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
        };
        totalRow.getCell(c).font = { bold: true, size: 10 };
    }
    row++;

    // Spacer row
    row++;

    return row;
}

/**
 * Writes an NLSubsection (e.g. KAS, BANK, PIUTANG) to the worksheet.
 * Returns the next available row number.
 */
function addSubsection(
    ws: ExcelJS.Worksheet,
    sub: NLSubsection,
    startRow: number
): number {
    let row = startRow;

    // Skip empty subsections
    if (sub.accounts.length === 0) return row;

    // Subsection header
    const subRow = ws.getRow(row);
    subRow.getCell(1).value = sub.label;
    subRow.getCell(1).font = { bold: true, size: 10, italic: true };
    subRow.getCell(1).fill = SUBSECTION_FILL;
    ws.mergeCells(row, 1, row, COL_COUNT);
    for (let c = 1; c <= COL_COUNT; c++) {
        subRow.getCell(c).border = BORDER_THIN;
        subRow.getCell(c).fill = SUBSECTION_FILL;
    }
    row++;

    // Account rows
    for (const acct of sub.accounts) {
        const acctRow = ws.getRow(row);
        acctRow.getCell(1).value = acct.code;
        acctRow.getCell(2).value = acct.name;
        acctRow.getCell(3).value = fmtRp(acct.balance);
        acctRow.getCell(3).alignment = { horizontal: "right" };
        for (let c = 1; c <= COL_COUNT; c++) {
            acctRow.getCell(c).border = BORDER_THIN;
            acctRow.getCell(c).font = { size: 10 };
        }
        row++;
    }

    // Subtotal row
    const subtotalRow = ws.getRow(row);
    subtotalRow.getCell(1).value = `Sub-total ${sub.label}`;
    subtotalRow.getCell(1).font = { bold: true, size: 10 };
    ws.mergeCells(row, 1, row, 2);
    subtotalRow.getCell(3).value = fmtRp(sub.total);
    subtotalRow.getCell(3).alignment = { horizontal: "right" };
    subtotalRow.getCell(3).font = { bold: true, size: 10 };
    for (let c = 1; c <= COL_COUNT; c++) {
        subtotalRow.getCell(c).border = BORDER_THIN;
        subtotalRow.getCell(c).font = { bold: true, size: 10 };
    }
    row++;

    return row;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const start = searchParams.get("startDate");
    const end = searchParams.get("endDate");

    if (!clientId || !start || !end) {
        return NextResponse.json(
            { error: "clientId, startDate, and endDate are required" },
            { status: 400 }
        );
    }

    const res = await getNeracaLajur(
        clientId,
        new Date(start),
        new Date(end)
    );

    if (!res.success || !res.data) {
        return NextResponse.json(
            { error: res.error || "Failed to fetch data" },
            { status: 500 }
        );
    }

    const { data } = res;

    // Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "Bay'sConsult";
    wb.created = new Date();

    const ws = wb.addWorksheet("Neraca Lajur", {
        pageSetup: { orientation: "landscape", paperSize: 9 }, // A4
    });

    // Column widths
    ws.columns = [
        { width: 14 }, // Kode Akun
        { width: 40 }, // Nama Akun
        { width: 22 }, // Saldo
        { width: 5 },  // Spacer column
    ];

    // Title rows
    const titleRow = ws.getRow(1);
    titleRow.getCell(1).value = data.clientName;
    titleRow.getCell(1).font = { bold: true, size: 14 };
    ws.mergeCells(1, 1, 1, COL_COUNT);

    const subtitleRow = ws.getRow(2);
    subtitleRow.getCell(1).value = "NERACA LAJUR (Trial Balance)";
    subtitleRow.getCell(1).font = { bold: true, size: 12 };
    ws.mergeCells(2, 1, 2, COL_COUNT);

    const periodRow = ws.getRow(3);
    periodRow.getCell(1).value = `Periode: ${fmtDate(data.startDate)} s/d ${fmtDate(data.endDate)}`;
    periodRow.getCell(1).font = { size: 10, italic: true };
    ws.mergeCells(3, 1, 3, COL_COUNT);

    // Column headers
    let currentRow = 5;
    const colHeaders = ["Kode", "Nama Akun", "Saldo", ""];
    const colHeaderRow = ws.getRow(currentRow);
    colHeaders.forEach((label, i) => {
        const cell = colHeaderRow.getCell(i + 1);
        cell.value = label;
        cell.font = { bold: true, size: 10 };
        cell.fill = HEADER_FILL;
        cell.border = BORDER_THIN;
        if (i === 2) cell.alignment = { horizontal: "right" };
    });
    currentRow++;

    // Empty data check
    const hasData =
        data.aset.subsections.some((s) => s.accounts.length > 0) ||
        data.kewajiban.subsections.some((s) => s.accounts.length > 0) ||
        data.labaRugi.subsections.some((s) => s.accounts.length > 0);

    if (!hasData) {
        ws.getRow(currentRow).getCell(1).value =
            "Tidak ada data untuk periode ini.";
    } else {
        // ASET section
        currentRow = addSection(ws, data.aset, currentRow);

        // KEWAJIBAN DAN MODAL section
        currentRow = addSection(ws, data.kewajiban, currentRow);

        // Balance check row (Aset vs Kewajiban+Modal)
        const balanceRow = ws.getRow(currentRow);
        balanceRow.getCell(1).value = "SELISIH (ASET - KEWAJIBAN & MODAL)";
        balanceRow.getCell(1).font = { bold: true, size: 10 };
        ws.mergeCells(currentRow, 1, currentRow, 2);
        const selisih = data.totalAset - data.totalKewajibanDanModal;
        balanceRow.getCell(3).value = fmtRp(selisih);
        balanceRow.getCell(3).alignment = { horizontal: "right" };
        balanceRow.getCell(3).font = {
            bold: true,
            size: 10,
            color: { argb: data.isBalanced ? "FF008000" : "FFFF0000" },
        };
        for (let c = 1; c <= COL_COUNT; c++) {
            balanceRow.getCell(c).border = {
                top: { style: "double" },
                bottom: { style: "double" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        }
        currentRow++;

        const statusRow = ws.getRow(currentRow);
        statusRow.getCell(1).value = data.isBalanced
            ? "BALANCE ✓"
            : "TIDAK BALANCE ✗";
        statusRow.getCell(1).font = {
            bold: true,
            size: 11,
            color: { argb: data.isBalanced ? "FF008000" : "FFFF0000" },
        };
        ws.mergeCells(currentRow, 1, currentRow, COL_COUNT);
        currentRow += 2;

        // LABA RUGI section
        currentRow = addSection(ws, data.labaRugi, currentRow);

        // Laba Rugi summary rows
        const summaryLabels = [
            { label: "Total Pendapatan", value: data.totalPendapatan },
            { label: "Total Beban", value: data.totalBeban },
            {
                label: "Laba/Rugi Sebelum Pajak",
                value: data.labaRugiSebelumPajak,
            },
            {
                label: "Laba/Rugi Setelah Pajak",
                value: data.labaRugiSetelahPajak,
            },
        ];

        for (const item of summaryLabels) {
            const sumRow = ws.getRow(currentRow);
            sumRow.getCell(1).value = item.label;
            sumRow.getCell(1).font = { bold: true, size: 10 };
            ws.mergeCells(currentRow, 1, currentRow, 2);
            sumRow.getCell(3).value = fmtRp(item.value);
            sumRow.getCell(3).alignment = { horizontal: "right" };
            sumRow.getCell(3).font = { bold: true, size: 10 };
            for (let c = 1; c <= COL_COUNT; c++) {
                sumRow.getCell(c).border = BORDER_THIN;
            }
            currentRow++;
        }
    }

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    const periodStr = `${format(new Date(data.startDate), "yyyyMMdd")}-${format(new Date(data.endDate), "yyyyMMdd")}`;
    const filename = `NeracaLajur_${data.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${periodStr}.xlsx`;

    return new NextResponse(buffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
