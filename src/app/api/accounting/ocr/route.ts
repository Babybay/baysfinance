import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { parseInvoiceText } from "@/lib/invoice-scanner";
import Tesseract from "tesseract.js";

// ─── OCR API — processes an accounting document image/PDF ────────────────────

export async function POST(req: NextRequest) {
    let documentId: string | undefined;

    try {
        const user = await currentUser();
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

        let ocrText = "";

        if (["jpg", "jpeg", "png"].includes(fileType)) {
            // OCR on image using Tesseract.js
            const result = await Tesseract.recognize(doc.fileUrl, "ind+eng", {
                logger: () => {},
            });
            ocrText = result.data.text;
        } else if (fileType === "pdf") {
            // For PDF, try fetching and extracting text with pdf-parse
            const { PDFParse } = await import("pdf-parse");
            const response = await fetch(doc.fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status}`);
            }
            const arrayBuf = await response.arrayBuffer();
            const parser = new PDFParse({ data: new Uint8Array(arrayBuf) });
            const textResult = await parser.getText();
            ocrText = textResult.text;

            // If PDF text is very short (scanned PDF), note limited extraction
            if (ocrText.trim().length < 50) {
                ocrText = `[Scanned PDF - limited text extracted]\n${ocrText}`;
            }
        } else {
            await prisma.accountingDocument.update({
                where: { id: documentId },
                data: { ocrStatus: "failed", ocrData: { error: "Unsupported file type" } },
            });
            return NextResponse.json({ error: "Unsupported file type for OCR" }, { status: 400 });
        }

        // Parse the extracted text into structured invoice data
        const invoiceData = parseInvoiceText(ocrText);

        // Store results
        await prisma.accountingDocument.update({
            where: { id: documentId },
            data: {
                ocrStatus: "done",
                ocrData: invoiceData as any,
            },
        });

        return NextResponse.json({
            success: true,
            data: invoiceData,
        });
    } catch (error) {
        console.error("[OCR API]", error);

        // Try to mark as failed
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
