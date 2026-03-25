import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { processOcrText } from "@/lib/ocr-processor";
import { ocrLimiter } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
const OCR_TIMEOUT_MS = 30_000; // 30 seconds

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Rate limit: 30 OCR requests per hour per user
        const rateCheck = ocrLimiter.check(user.id);
        if (!rateCheck.success) {
            return NextResponse.json(
                { success: false, error: "Terlalu banyak permintaan OCR. Coba lagi nanti." },
                { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
            );
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "File tidak ditemukan." }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: "Ukuran file melebihi batas 10 MB." },
                { status: 400 },
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isImage = IMAGE_TYPES.includes(file.type);

        if (!isPdf && !isImage) {
            return NextResponse.json(
                { success: false, error: "Format file tidak didukung. Gunakan JPG, PNG, WebP, BMP, atau PDF." },
                { status: 400 },
            );
        }

        let rawText = "";
        let ocrConfidence = 0;
        let wordCount = 0;
        let method: "ocr" | "pdf-text" = "ocr";

        if (isPdf) {
            // ── PDF: extract text using pdf-parse ─────────────────────
            method = "pdf-text";
            try {
                const { PDFParse, VerbosityLevel } = await import("pdf-parse");
                const parser = new PDFParse({
                    verbosity: VerbosityLevel.ERRORS,
                    data: new Uint8Array(buffer),
                });
                const result = await parser.getText();
                await parser.destroy();
                // Strip page separator markers (e.g. "-- 1 of 3 --")
                rawText = (result.text || "").replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").trim();
                wordCount = rawText.split(/\s+/).filter(Boolean).length;
                // PDF text extraction is deterministic — high confidence if text exists
                ocrConfidence = rawText.length > 20 ? 90 : rawText.length > 0 ? 60 : 0;

                if (rawText.length === 0) {
                    // PDF might be scanned image — try OCR on it
                    // pdf-parse can't help; inform user
                    return NextResponse.json({
                        success: false,
                        error: "PDF ini tidak mengandung teks (kemungkinan scan/gambar). Silakan convert ke gambar (JPG/PNG) terlebih dahulu, lalu upload ulang.",
                    });
                }
            } catch (pdfErr) {
                console.error("[api/ocr] pdf-parse error:", pdfErr);
                return NextResponse.json(
                    { success: false, error: "Gagal membaca PDF. Pastikan file tidak corrupt atau terproteksi password." },
                    { status: 400 },
                );
            }
        } else {
            // ── Image: OCR using Tesseract.js v5 ──────────────────────
            try {
                const Tesseract = await import("tesseract.js");
                const worker = await Tesseract.createWorker("ind+eng");
                // Timeout protection — prevent worker from hanging on corrupted images
                const { data } = await Promise.race([
                    worker.recognize(buffer),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("OCR_TIMEOUT")), OCR_TIMEOUT_MS)
                    ),
                ]);
                rawText = data.text || "";
                ocrConfidence = Math.round(data.confidence);
                wordCount = data.words?.length || 0;
                await worker.terminate();
            } catch (ocrErr) {
                const msg = ocrErr instanceof Error && ocrErr.message === "OCR_TIMEOUT"
                    ? "OCR timeout — file terlalu besar atau rusak. Coba gambar yang lebih kecil."
                    : "Gagal memproses OCR. Pastikan file berupa gambar yang jelas.";
                console.error("[api/ocr] tesseract error:", ocrErr);
                return NextResponse.json(
                    { success: false, error: msg },
                    { status: 500 },
                );
            }
        }

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
                wordCount,
                method,
            },
        });
    } catch (error) {
        console.error("[api/ocr]", error);
        return NextResponse.json(
            { success: false, error: "Gagal memproses file." },
            { status: 500 },
        );
    }
}
