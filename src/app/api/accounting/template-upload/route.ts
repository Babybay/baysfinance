import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ingestTemplateFile } from "@/lib/ingestion/template-ingestion";

export const maxDuration = 120; // 2 minutes for large templates

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const importedBy = user.name || "Unknown";

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
    const role = user.role.toLowerCase();
    if (role === "client") {
        const ownClientId = user.clientId;
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestTemplateFile(buffer, clientId, fileName, importedBy);

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
