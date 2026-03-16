import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Tesseract from "tesseract.js";
import { processOcrText } from "@/lib/ocr-processor";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "application/pdf"];

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const lang = (formData.get("lang") as string) || "ind+eng";

        if (!file) {
            return NextResponse.json({ success: false, error: "File tidak ditemukan." }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: "Ukuran file melebihi batas 10 MB." },
                { status: 400 },
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF." },
                { status: 400 },
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Run Tesseract OCR
        const { data } = await Tesseract.recognize(buffer, lang, {
            logger: () => {}, // suppress progress logs in production
        });

        const rawText = data.text;
        const ocrConfidence = Math.round(data.confidence);

        // Process the extracted text into structured data
        const result = processOcrText(rawText);

        return NextResponse.json({
            success: true,
            ocr: {
                rawText,
                ocrConfidence,
                documentType: result.documentType,
                typeConfidence: result.confidence,
                fields: result.fields,
                rows: result.rows,
                warnings: result.warnings,
                wordCount: (data as any).words?.length || 0,
            },
        });
    } catch (error) {
        console.error("[api/ocr]", error);
        return NextResponse.json(
            { success: false, error: "Gagal memproses OCR. Pastikan file berupa gambar yang jelas." },
            { status: 500 },
        );
    }
}
