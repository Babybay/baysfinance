"use server";

import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, buildStorageUrl, extractStorageKey } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AccDocType, AccDocModule, Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import { importDocumentEntries } from "@/app/actions/import-accounting";
import type { GeneratedEntry } from "@/lib/journal-generator";
import type { DocumentType } from "@/lib/document-detector";

const BUCKET = BUCKET_NAME;

// ─── GET ACCOUNTING DOCUMENTS ────────────────────────────────────────────────

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getAccountingDocuments(
    clientId: string,
    filters?: {
        search?: string;
        documentType?: AccDocType;
        linkedModule?: AccDocModule;
        startDate?: string;
        endDate?: string;
    }
) {
    try {
        await assertCanAccessClient(clientId);

        const where: Prisma.AccountingDocumentWhereInput = {
            clientId,
            deletedAt: null,
        };

        if (filters?.documentType) {
            where.documentType = filters.documentType;
        }
        if (filters?.linkedModule) {
            where.linkedModule = filters.linkedModule;
        }
        if (filters?.startDate || filters?.endDate) {
            where.documentDate = {};
            if (filters.startDate) where.documentDate.gte = new Date(filters.startDate);
            if (filters.endDate) where.documentDate.lte = new Date(filters.endDate);
        }
        if (filters?.search) {
            where.OR = [
                { documentName: { contains: filters.search, mode: "insensitive" } },
                { description: { contains: filters.search, mode: "insensitive" } },
                { uploadedBy: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        const documents = await prisma.accountingDocument.findMany({
            where,
            include: {
                client: { select: { nama: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const mapped = documents.map((doc) => ({
            ...doc,
            clientName: doc.client.nama,
            ocrStatus: doc.ocrStatus ?? null,
            ocrData: doc.ocrData ?? null,
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error("[getAccountingDocuments]", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ─── UPLOAD ACCOUNTING DOCUMENT ──────────────────────────────────────────────

export async function uploadAccountingDocument(formData: FormData) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Sesi tidak valid." };

        const file = formData.get("file") as File;
        const documentName = formData.get("documentName") as string;
        const documentType = formData.get("documentType") as string;
        const linkedModule = formData.get("linkedModule") as string | null;
        const clientId = formData.get("clientId") as string;
        const documentDate = formData.get("documentDate") as string;
        const description = formData.get("description") as string | null;

        if (!file || !documentName || !documentType || !clientId || !documentDate) {
            return { success: false, error: "Data tidak lengkap." };
        }

        await assertCanAccessClient(clientId);

        // Validate file size (max 50MB)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, error: "Ukuran file melebihi batas 50MB." };
        }

        // Validate file type
        const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
            return { success: false, error: "Tipe file tidak diizinkan. Hanya PDF, JPG, dan PNG." };
        }

        // Upload to TrueNAS/MinIO-compatible object storage. Neon stores only URL/metadata.
        const key = `accounting-docs/${clientId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: Buffer.from(arrayBuffer),
                ContentType: file.type,
            })
        );

        const fileUrl = buildStorageUrl(key);

        const document = await prisma.accountingDocument.create({
            data: {
                documentName,
                documentType: documentType as AccDocType,
                linkedModule: linkedModule ? (linkedModule as AccDocModule) : null,
                documentDate: new Date(documentDate),
                description: description || null,
                fileUrl,
                fileType: ext,
                fileSize: file.size,
                uploadedBy: user.name || user.email || "Unknown",
                clientId,
            },
        });

        revalidatePath("/dashboard/accounting/documents");
        return { success: true, data: document };
    } catch (error) {
        console.error("[uploadAccountingDocument]", error);
        return handleAuthError(error);
    }
}

// ─── UPDATE ACCOUNTING DOCUMENT ──────────────────────────────────────────────

export async function updateAccountingDocument(
    id: string,
    data: {
        documentName?: string;
        documentType?: AccDocType;
        linkedModule?: AccDocModule | null;
        documentDate?: string;
        description?: string | null;
    }
) {
    try {
        const existing = await prisma.accountingDocument.findUnique({
            where: { id },
            select: { clientId: true },
        });
        if (!existing) return { success: false, error: "Dokumen tidak ditemukan." };

        await assertCanAccessClient(existing.clientId);

        const updateData: Prisma.AccountingDocumentUpdateInput = { ...data };
        if (data.documentDate) {
            updateData.documentDate = new Date(data.documentDate);
        }

        const document = await prisma.accountingDocument.update({
            where: { id },
            data: updateData,
        });

        revalidatePath("/dashboard/accounting/documents");
        return { success: true, data: document };
    } catch (error) {
        console.error("[updateAccountingDocument]", error);
        return handleAuthError(error);
    }
}

// ─── DELETE ACCOUNTING DOCUMENT ──────────────────────────────────────────────

export async function deleteAccountingDocument(id: string) {
    try {
        const document = await prisma.accountingDocument.findUnique({
            where: { id },
            select: { fileUrl: true, clientId: true },
        });
        if (!document) return { success: false, error: "Dokumen tidak ditemukan." };

        await assertCanAccessClient(document.clientId);

        // Delete from object storage
        if (document.fileUrl) {
            try {
                const key = extractStorageKey(document.fileUrl);
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: key,
                    })
                );
            } catch (e) {
                console.error("[deleteAccountingDocument] object storage cleanup failed:", e);
            }
        }

        // Soft delete
        await prisma.accountingDocument.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        revalidatePath("/dashboard/accounting/documents");
        return { success: true };
    } catch (error) {
        console.error("[deleteAccountingDocument]", error);
        return handleAuthError(error);
    }
}

// ─── POST SCANNED ENTRIES TO JOURNAL ─────────────────────────────────────────

export async function postScannedEntries(
    documentId: string,
    entries: GeneratedEntry[],
    clientId: string,
    docType: DocumentType = "invoice",
) {
    try {
        await assertCanAccessClient(clientId);

        const doc = await prisma.accountingDocument.findUnique({
            where: { id: documentId },
            select: { documentName: true, clientId: true },
        });

        if (!doc) return { success: false, error: "Dokumen tidak ditemukan." };
        if (doc.clientId !== clientId) return { success: false, error: "Akses ditolak." };

        const fileName = `OCR: ${doc.documentName}`;

        const result = await importDocumentEntries(entries, clientId, docType, fileName);

        if (result.success && result.imported > 0) {
            // Update the document's ocrStatus to "posted"
            const existingData = await prisma.accountingDocument.findUnique({
                where: { id: documentId },
                select: { ocrData: true },
            });

            await prisma.accountingDocument.update({
                where: { id: documentId },
                data: {
                    ocrStatus: "posted",
                    ocrData: toPrismaJson({
                        ...(existingData?.ocrData as Record<string, unknown> || {}),
                        postedBatchId: result.batchId,
                        postedAt: new Date().toISOString(),
                    }),
                },
            });
        }

        revalidatePath("/dashboard/accounting/import");
        revalidatePath("/dashboard/accounting/journal");
        return result;
    } catch (error) {
        console.error("[postScannedEntries]", error);
        return { ...handleAuthError(error), imported: 0, skipped: 0, errors: [] };
    }
}
