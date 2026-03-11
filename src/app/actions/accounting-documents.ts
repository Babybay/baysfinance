"use server";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AccDocType, AccDocModule } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { assertCanAccessClient, handleAuthError, isAdminOrStaff } from "@/lib/auth-helpers";

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

function extractR2Key(fileUrl: string): string {
    return fileUrl.replace(`${PUBLIC_URL}/`, "");
}

// ─── GET ACCOUNTING DOCUMENTS ────────────────────────────────────────────────

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

        const where: any = {
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
        const user = await currentUser();
        if (!user) return { success: false, error: "Sesi tidak valid." };

        const admin = await isAdminOrStaff();

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

        // Upload to R2
        const key = `accounting-docs/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        await R2.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: Buffer.from(arrayBuffer),
                ContentType: file.type,
            })
        );

        const fileUrl = `${PUBLIC_URL}/${key}`;

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
                uploadedBy: user.fullName || user.emailAddresses[0]?.emailAddress || "Unknown",
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

        const updateData: any = { ...data };
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

        // Delete from R2
        if (document.fileUrl) {
            try {
                const key = extractR2Key(document.fileUrl);
                await R2.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: key,
                    })
                );
            } catch (e) {
                console.error("[deleteAccountingDocument] R2 cleanup failed:", e);
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
