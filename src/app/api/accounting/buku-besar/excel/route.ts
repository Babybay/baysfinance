import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getBukuBesar, type BukuBesarAccount } from "@/app/actions/accounting/buku-besar";
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

const BORDER_THIN: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
};

function addAccountSheet(
    ws: ExcelJS.Worksheet,
    account: BukuBesarAccount,
    clientName: string,
    startDate: string,
    endDate: string,
    startRow: number
): number {
    let row = startRow;

    // Account header
    const headerRow = ws.getRow(row);
    headerRow.getCell(1).value = `${account.accountCode} - ${account.accountName}`;
    headerRow.getCell(1).font = { bold: true, size: 11 };
    headerRow.getCell(1).fill = HEADER_FILL;
    ws.mergeCells(row, 1, row, 6);
    headerRow.getCell(1).border = BORDER_THIN;
    row++;

    // Column headers
    const cols = ["Tanggal", "Ref", "Keterangan", "Debit", "Kredit", "Saldo"];
    const colRow = ws.getRow(row);
    cols.forEach((label, i) => {
        const cell = colRow.getCell(i + 1);
        cell.value = label;
        cell.font = { bold: true, size: 10 };
        cell.fill = HEADER_FILL;
        cell.border = BORDER_THIN;
        if (i >= 3) cell.alignment = { horizontal: "right" };
    });
    row++;

    // Opening balance
    const openRow = ws.getRow(row);
    openRow.getCell(1).value = fmtDate(startDate);
    openRow.getCell(3).value = "Saldo Awal";
    openRow.getCell(6).value = fmtRp(account.openingBalance);
    openRow.getCell(6).alignment = { horizontal: "right" };
    openRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10 };
        cell.border = BORDER_THIN;
    });
    // Fill empty cells with borders
    for (let c = 1; c <= 6; c++) {
        openRow.getCell(c).border = BORDER_THIN;
    }
    row++;

    // Transactions
    for (const tx of account.transactions) {
        const txRow = ws.getRow(row);
        txRow.getCell(1).value = fmtDate(tx.date);
        txRow.getCell(2).value = tx.refNumber;
        txRow.getCell(3).value = tx.description;
        txRow.getCell(4).value = tx.debit > 0 ? fmtRp(tx.debit) : " - ";
        txRow.getCell(4).alignment = { horizontal: "right" };
        txRow.getCell(5).value = tx.credit > 0 ? fmtRp(tx.credit) : " - ";
        txRow.getCell(5).alignment = { horizontal: "right" };
        txRow.getCell(6).value = fmtRp(tx.runningBalance);
        txRow.getCell(6).alignment = { horizontal: "right" };
        for (let c = 1; c <= 6; c++) {
            txRow.getCell(c).border = BORDER_THIN;
            txRow.getCell(c).font = { size: 10 };
        }
        row++;
    }

    // Totals row
    const totRow = ws.getRow(row);
    totRow.getCell(3).value = "Total";
    totRow.getCell(4).value = fmtRp(account.totalDebit);
    totRow.getCell(4).alignment = { horizontal: "right" };
    totRow.getCell(5).value = fmtRp(account.totalCredit);
    totRow.getCell(5).alignment = { horizontal: "right" };
    for (let c = 1; c <= 6; c++) {
        totRow.getCell(c).font = { bold: true, size: 10 };
        totRow.getCell(c).border = {
            top: { style: "double" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
        };
    }
    row++;

    // Closing balance
    const closeRow = ws.getRow(row);
    closeRow.getCell(1).value = fmtDate(endDate);
    closeRow.getCell(3).value = "Saldo Akhir";
    closeRow.getCell(6).value = fmtRp(account.closingBalance);
    closeRow.getCell(6).alignment = { horizontal: "right" };
    for (let c = 1; c <= 6; c++) {
        closeRow.getCell(c).font = { bold: true, size: 10 };
        closeRow.getCell(c).border = {
            top: { style: "double" },
            bottom: { style: "double" },
            left: { style: "thin" },
            right: { style: "thin" },
        };
    }
    row++;

    // Empty spacer row
    row++;

    return row;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const start = searchParams.get("startDate");
    const end = searchParams.get("endDate");
    const accountCode = searchParams.get("accountCode") || undefined;

    if (!clientId || !start || !end) {
        return NextResponse.json(
            { error: "clientId, startDate, and endDate are required" },
            { status: 400 }
        );
    }

    const res = await getBukuBesar(
        clientId,
        new Date(start),
        new Date(end),
        accountCode
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

    const ws = wb.addWorksheet("Buku Besar", {
        pageSetup: { orientation: "landscape", paperSize: 9 }, // A4
    });

    // Column widths
    ws.columns = [
        { width: 14 }, // Tanggal
        { width: 18 }, // Ref
        { width: 40 }, // Keterangan
        { width: 18 }, // Debit
        { width: 18 }, // Kredit
        { width: 20 }, // Saldo
    ];

    // Title rows
    const titleRow = ws.getRow(1);
    titleRow.getCell(1).value = data.clientName;
    titleRow.getCell(1).font = { bold: true, size: 14 };
    ws.mergeCells(1, 1, 1, 6);

    const subtitleRow = ws.getRow(2);
    subtitleRow.getCell(1).value = "BUKU BESAR (General Ledger)";
    subtitleRow.getCell(1).font = { bold: true, size: 12 };
    ws.mergeCells(2, 1, 2, 6);

    const periodRow = ws.getRow(3);
    periodRow.getCell(1).value = `Periode: ${fmtDate(data.startDate)} s/d ${fmtDate(data.endDate)}`;
    periodRow.getCell(1).font = { size: 10, italic: true };
    ws.mergeCells(3, 1, 3, 6);

    let currentRow = 5;

    if (data.accounts.length === 0) {
        ws.getRow(currentRow).getCell(1).value = "Tidak ada data untuk periode ini.";
    } else {
        for (const account of data.accounts) {
            currentRow = addAccountSheet(
                ws,
                account,
                data.clientName,
                data.startDate,
                data.endDate,
                currentRow
            );
        }
    }

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    const periodStr = `${format(new Date(data.startDate), "yyyyMMdd")}-${format(new Date(data.endDate), "yyyyMMdd")}`;
    const filename = `BukuBesar_${data.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${periodStr}.xlsx`;

    return new NextResponse(buffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
