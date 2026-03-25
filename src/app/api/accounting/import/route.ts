import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import * as XLSX from "xlsx";
import { detectFromHeaders, extractHeaders } from "@/lib/document-detector";
import { mapColumns } from "@/lib/column-mapper";
import { findHeaderRow, parseRows } from "@/lib/document-parser";
import { generateJournalEntries } from "@/lib/journal-generator";
import type { DocumentType } from "@/lib/document-detector";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const overrideType = formData.get("documentType") as DocumentType | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "File tidak ditemukan." }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: "Ukuran file melebihi batas 10 MB." },
                { status: 400 }
            );
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext || "")) {
            return NextResponse.json(
                { success: false, error: "Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv" },
                { status: 400 }
            );
        }

        // Parse with xlsx
        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return NextResponse.json(
                { success: false, error: "File tidak memiliki sheet data." },
                { status: 400 }
            );
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rawRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "File kosong." },
                { status: 400 }
            );
        }

        // Step 1: Extract headers and detect document type
        const { headers } = extractHeaders(rawRows);
        const detection = detectFromHeaders(headers);
        const docType = overrideType || detection.type;

        // Step 2: Map columns using fuzzy matching
        const columnMatch = mapColumns(headers, docType);

        // Step 3: Find header row and parse data
        const matchedHeaders = columnMatch.matched.map((m) => m.fileHeader);
        const headerResult = findHeaderRow(rawRows, matchedHeaders);

        if (!headerResult) {
            return NextResponse.json({
                success: false,
                error: "Tidak dapat menemukan baris header dalam file.",
                detection,
                columnMapping: columnMatch,
            }, { status: 400 });
        }

        const { rows: parsedRows, errors: parseErrors, warnings: parseWarnings } =
            parseRows(rawRows, headerResult.headerIndex, headerResult.columnMap, columnMatch, docType);

        // Step 4: Generate journal entries
        const generation = generateJournalEntries(parsedRows, docType);

        // Build raw preview (first 5 data rows)
        const rawPreview = rawRows
            .slice(headerResult.headerIndex + 1, headerResult.headerIndex + 6)
            .map((row) => {
                const obj: Record<string, unknown> = {};
                for (const [header, key] of Object.entries(headerResult.columnMap)) {
                    obj[header] = row[key];
                }
                return obj;
            });

        return NextResponse.json({
            success: parseErrors.length === 0 && generation.errors.length === 0,
            detection: {
                type: docType,
                confidence: detection.confidence,
                label: detection.label,
                detectedColumns: detection.detectedColumns,
                overridden: !!overrideType,
            },
            columnMapping: {
                matched: columnMatch.matched,
                unmatched: columnMatch.unmatched,
                confidence: columnMatch.confidence,
            },
            entries: generation.entries,
            parsedRows,
            rawPreview,
            errors: [...parseErrors, ...generation.errors],
            warnings: [...parseWarnings, ...generation.warnings],
            totalEntries: generation.entries.length,
            fileName: file.name,
        });
    } catch (error) {
        console.error("[accounting/import]", error);
        return NextResponse.json(
            { success: false, error: "Gagal memproses file. Pastikan format file benar." },
            { status: 500 }
        );
    }
}
