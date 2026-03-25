import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getFinancialReports } from "@/app/actions/accounting";

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

const HEADER_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
};

const SECTION_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF6FF" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
};

interface ReportItem {
    name: string;
    value: number;
}

function addSection(
    ws: ExcelJS.Worksheet,
    title: string,
    items: ReportItem[],
    startRow: number
): number {
    let row = startRow;

    // Section header
    const headerRow = ws.getRow(row);
    headerRow.getCell(1).value = title;
    headerRow.getCell(1).font = { bold: true, size: 11 };
    headerRow.getCell(1).fill = SECTION_FILL;
    headerRow.getCell(2).fill = SECTION_FILL;
    headerRow.getCell(1).border = BORDER_THIN;
    headerRow.getCell(2).border = BORDER_THIN;
    row++;

    // Items
    let total = 0;
    for (const item of items) {
        const r = ws.getRow(row);
        r.getCell(1).value = `  ${item.name}`;
        r.getCell(2).value = fmtRp(item.value);
        r.getCell(2).alignment = { horizontal: "right" };
        r.getCell(1).border = BORDER_THIN;
        r.getCell(2).border = BORDER_THIN;
        total += item.value;
        row++;
    }

    // Total row
    const totalRow = ws.getRow(row);
    totalRow.getCell(1).value = `Total ${title}`;
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).value = fmtRp(total);
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(2).alignment = { horizontal: "right" };
    totalRow.getCell(1).border = BORDER_THIN;
    totalRow.getCell(2).border = BORDER_THIN;
    row++;

    return row;
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!clientId) {
        return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : undefined;

    const res = await getFinancialReports(clientId, startDate, endDate);
    if (!res.success || !res.data) {
        return NextResponse.json({ error: res.error || "Failed" }, { status: 500 });
    }

    const { neraca, labaRugi } = res.data;

    const wb = new ExcelJS.Workbook();

    // ── Sheet 1: Neraca (Balance Sheet) ─────────────────────────────────────
    const wsNeraca = wb.addWorksheet("Neraca");
    wsNeraca.columns = [
        { width: 40 },
        { width: 25 },
    ];

    // Title
    const titleRow = wsNeraca.getRow(1);
    titleRow.getCell(1).value = "NERACA (Balance Sheet)";
    titleRow.getCell(1).font = { bold: true, size: 14 };
    const dateRow = wsNeraca.getRow(2);
    dateRow.getCell(1).value = `Per ${endDate.toLocaleDateString("id-ID")}`;
    dateRow.getCell(1).font = { color: { argb: "FF666666" } };

    // Column headers
    const colHeaderRow = wsNeraca.getRow(4);
    colHeaderRow.getCell(1).value = "Akun";
    colHeaderRow.getCell(2).value = "Saldo";
    colHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = HEADER_FILL;
        cell.border = BORDER_THIN;
    });

    let nextRow = 5;
    nextRow = addSection(wsNeraca, "ASET", neraca.assets, nextRow);
    nextRow++;
    nextRow = addSection(wsNeraca, "KEWAJIBAN", neraca.liabilities, nextRow);
    nextRow++;
    nextRow = addSection(wsNeraca, "EKUITAS", neraca.equity, nextRow);

    // ── Sheet 2: Laba Rugi (P&L) ───────────────────────────────────────────
    const wsPL = wb.addWorksheet("Laba Rugi");
    wsPL.columns = [
        { width: 40 },
        { width: 25 },
    ];

    const plTitle = wsPL.getRow(1);
    plTitle.getCell(1).value = "LABA RUGI (Profit & Loss)";
    plTitle.getCell(1).font = { bold: true, size: 14 };
    const plDate = wsPL.getRow(2);
    const periodStr = startDate
        ? `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`
        : `Per ${endDate.toLocaleDateString("id-ID")}`;
    plDate.getCell(1).value = periodStr;
    plDate.getCell(1).font = { color: { argb: "FF666666" } };

    const plColHeader = wsPL.getRow(4);
    plColHeader.getCell(1).value = "Akun";
    plColHeader.getCell(2).value = "Jumlah";
    plColHeader.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = HEADER_FILL;
        cell.border = BORDER_THIN;
    });

    let plRow = 5;
    plRow = addSection(wsPL, "PENDAPATAN", labaRugi.revenue, plRow);
    plRow++;
    plRow = addSection(wsPL, "BEBAN", labaRugi.expenses, plRow);
    plRow++;

    // Net Profit row
    const totalRevenue = labaRugi.revenue.reduce((s: number, a: ReportItem) => s + a.value, 0);
    const totalExpenses = labaRugi.expenses.reduce((s: number, a: ReportItem) => s + a.value, 0);
    const netProfit = totalRevenue - totalExpenses;

    const profitRow = wsPL.getRow(plRow);
    profitRow.getCell(1).value = "LABA (RUGI) BERSIH";
    profitRow.getCell(1).font = { bold: true, size: 12 };
    profitRow.getCell(2).value = fmtRp(netProfit);
    profitRow.getCell(2).font = { bold: true, size: 12, color: { argb: netProfit >= 0 ? "FF16A34A" : "FFDC2626" } };
    profitRow.getCell(2).alignment = { horizontal: "right" };
    profitRow.getCell(1).border = BORDER_THIN;
    profitRow.getCell(2).border = BORDER_THIN;

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="Laporan_Keuangan.xlsx"`,
        },
    });
}
