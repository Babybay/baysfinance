import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ingestTemplateFile } from "@/lib/ingestion/template-ingestion";
import type { IngestionResult } from "@/lib/ingestion/template-ingestion";

export const maxDuration = 120; // 2 minutes for large templates

const PYTHON_SERVICE_URL = process.env.INGESTION_SERVICE_URL || "http://localhost:8001";

/**
 * POST /api/accounting/template-upload
 *
 * Strategy:
 *   1. Try Python FastAPI ingestion service (enhanced processing with openpyxl)
 *   2. Fallback to TypeScript XLSX-based ingestion if Python service is unavailable
 */
export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const importedBy = user.fullName || user.username || "Unknown";

    const formData = await req.formData();
    const clientId = formData.get("clientId") as string;
    const file = formData.get("file") as File | null;

    if (!clientId || !file) {
        return NextResponse.json(
            { error: "clientId and file are required" },
            { status: 400 },
        );
    }

    // Check role-based access
    const role = (user.publicMetadata?.role as string) || "client";
    if (role === "client") {
        const ownClientId = user.publicMetadata?.clientId as string | undefined;
        if (!ownClientId || ownClientId !== clientId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    // Validate file type
    const fileName = file.name;
    if (!/\.(xlsx?|csv)$/i.test(fileName)) {
        return NextResponse.json(
            { error: "Hanya file Excel (.xlsx, .xls) yang didukung" },
            { status: 400 },
        );
    }

    // Max 10MB per file
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
            { error: "Ukuran file melebihi 10MB" },
            { status: 400 },
        );
    }

    // ── Strategy 1: Try Python FastAPI service ──────────────────────────
    try {
        const pyForm = new FormData();
        pyForm.append("file", file);
        pyForm.append("client_id", clientId);
        pyForm.append("imported_by", importedBy);

        const pyRes = await fetch(`${PYTHON_SERVICE_URL}/process`, {
            method: "POST",
            body: pyForm,
            signal: AbortSignal.timeout(90_000), // 90s timeout
        });

        if (pyRes.ok) {
            const pyData = await pyRes.json();

            // Map Python response → TypeScript IngestionResult interface
            const result: IngestionResult = {
                success: pyData.success,
                batchId: pyData.batch_id,
                companyName: pyData.company_name || "",
                period: pyData.period || "",
                journalsCreated: pyData.total_entries || 0,
                assetsCreated: pyData.total_assets || 0,
                snapshotsCreated: Object.values(pyData.sheet_results || {}).filter(
                    (s: any) => s.has_snapshot
                ).length,
                skipped: pyData.total_skipped || 0,
                warnings: pyData.warnings || [],
                errors: pyData.errors || [],
            };

            return NextResponse.json(result, { status: result.success ? 200 : 422 });
        }

        // Python service returned an error — fall through to TypeScript
        console.warn("[template-upload] Python service error, falling back to TS:", pyRes.status);
    } catch (err) {
        // Python service unavailable — fall through to TypeScript
        console.warn("[template-upload] Python service unavailable, using TS fallback:", err instanceof Error ? err.message : err);
    }

    // ── Strategy 2: Fallback to TypeScript XLSX ─────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestTemplateFile(buffer, clientId, fileName, importedBy);

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
