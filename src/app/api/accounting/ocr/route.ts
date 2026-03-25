import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { classifyOcrText } from "@/lib/ocr-document-classifier";
import { parseOcrDocument } from "@/lib/ocr-document-parser";
import { mapOcrToJournalEntries } from "@/lib/ocr-journal-mapper";

// PaddleOCR Python service URL
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8100";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// ─── OCR API — sends document to PaddleOCR service for processing ────────────

export async function POST(req: NextRequest) {
    let documentId: string | undefined;

    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        documentId = body.documentId;

        if (!documentId) {
            return NextResponse.json({ error: "documentId required" }, { status: 400 });
        }

        // Fetch the document
        const doc = await prisma.accountingDocument.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Mark as processing
        await prisma.accountingDocument.update({
            where: { id: documentId },
            data: { ocrStatus: "processing" },
        });

        const fileType = doc.fileType.toLowerCase();

        if (!["jpg", "jpeg", "png", "pdf"].includes(fileType)) {
            await prisma.accountingDocument.update({
                where: { id: documentId },
                data: { ocrStatus: "failed", ocrData: { error: "Unsupported file type" } },
            });
            return NextResponse.json({ error: "Unsupported file type for OCR" }, { status: 400 });
        }

        // Generate a presigned URL so the OCR service can access the file
        const r2Key = doc.fileUrl.replace(`${PUBLIC_URL}/`, "");
        const presignedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }),
            { expiresIn: 600 },
        );

        // Call PaddleOCR service
        const ocrResponse = await fetch(`${OCR_SERVICE_URL}/ocr/url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: presignedUrl,
                file_type: fileType === "pdf" ? "pdf" : "image",
            }),
        });

        if (!ocrResponse.ok) {
            throw new Error(`OCR service returned ${ocrResponse.status}`);
        }

        const ocrResult = await ocrResponse.json();

        if (!ocrResult.success) {
            throw new Error(ocrResult.error || "OCR service failed");
        }

        const ocrText = ocrResult.text || "";

        // 1) Classify the document type from OCR text
        const classification = classifyOcrText(ocrText);

        // 2) Parse the text based on detected type
        const parsedData = parseOcrDocument(ocrText, classification.accDocType);
        parsedData.confidence = Math.round(
            (parsedData.confidence + classification.confidence) / 2,
        );

        // 3) Generate suggested journal entries
        const suggestedEntries = mapOcrToJournalEntries(parsedData);
        parsedData.suggestedEntries = suggestedEntries.map((e) => ({
            description: e.description,
            items: e.items,
        }));

        // 4) Auto-update document type/module if confidence > 70%
        const updateData: Record<string, unknown> = {
            ocrStatus: "done",
            ocrData: {
                ...parsedData,
                classification,
                ocrEntries: ocrResult.entries,
                processingTimeMs: ocrResult.processing_time_ms,
                pageCount: ocrResult.page_count,
                journalEntries: suggestedEntries,
            },
        };

        if (classification.confidence >= 70) {
            updateData.documentType = classification.accDocType;
            updateData.linkedModule = classification.accDocModule;
        }

        await prisma.accountingDocument.update({
            where: { id: documentId },
            data: updateData as any,
        });

        return NextResponse.json({
            success: true,
            data: {
                ...parsedData,
                classification,
                journalEntries: suggestedEntries,
                processingTimeMs: ocrResult.processing_time_ms,
                pageCount: ocrResult.page_count,
            },
        });
    } catch (error) {
        console.error("[OCR API]", error);

        if (documentId) {
            try {
                await prisma.accountingDocument.update({
                    where: { id: documentId },
                    data: {
                        ocrStatus: "failed",
                        ocrData: { error: String(error) },
                    },
                });
            } catch {}
        }

        return NextResponse.json(
            { error: "OCR processing failed", details: String(error) },
            { status: 500 }
        );
    }
}
