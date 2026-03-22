"use server";

import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentKategori } from "@prisma/client";
import {
    assertCanAccessClient,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";

const BUCKET = BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

// Ekstrak R2 key dari full URL
function extractR2Key(fileUrl: string): string {
    return fileUrl.replace(`${PUBLIC_URL}/`, "");
}

// ─── GET ALL DOCUMENTS ───────────────────────────────────────────────────────

export async function getDocuments(clientId?: string) {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, data: [], error: "Akses ditolak." };
        }

        const documents = await prisma.document.findMany({
            where: {
                ...(clientId ? { clientId } : {}),
            },
            include: {
                client: { select: { nama: true } },
            },
            orderBy: { tanggalUpload: "desc" },
        });

        const mapped = documents.map((doc) => ({
            ...doc,
            clientName: doc.client.nama,
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error("getDocuments error:", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ─── UPLOAD DOCUMENT ─────────────────────────────────────────────────────────

export async function uploadDocument(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        const nama = formData.get("nama") as string;
        const kategori = formData.get("kategori") as string;
        const clientId = formData.get("clientId") as string;
        const catatan = formData.get("catatan") as string | null;
        const permitCaseId = formData.get("permitCaseId") as string | null;
        const invoiceId = formData.get("invoiceId") as string | null;
        const deadlineId = formData.get("deadlineId") as string | null;

        if (!file || !nama || !kategori || !clientId) {
            return { success: false, error: "Data tidak lengkap" };
        }

        await assertCanAccessClient(clientId);

        // Validate file size (max 50MB)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, error: "Ukuran file melebihi batas 50MB" };
        }

        // Validate file type
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls', 'doc', 'docx', 'csv'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
            return { success: false, error: "Tipe file tidak diizinkan" };
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { nama: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        // Build unique R2 key
        const key = `documents/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Upload ke R2
        const arrayBuffer = await file.arrayBuffer();
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: Buffer.from(arrayBuffer),
                ContentType: file.type,
            })
        );

        const fileUrl = `${PUBLIC_URL}/${key}`;

        const document = await prisma.document.create({
            data: {
                nama,
                kategori: kategori as DocumentKategori,
                clientId,
                ukuran: file.size,
                catatan: catatan || null,
                fileUrl,
                ...(permitCaseId ? { permitCaseId } : {}),
                ...(invoiceId ? { invoiceId } : {}),
                ...(deadlineId ? { deadlineId } : {}),
            },
        });

        revalidatePath("/dashboard/documents");
        return { success: true, data: document };
    } catch (error) {
        console.error("uploadDocument error:", error);
        return handleAuthError(error);
    }
}

// ─── UPDATE DOCUMENT ─────────────────────────────────────────────────────────

export async function updateDocument(
    id: string,
    data: { nama?: string; kategori?: DocumentKategori; catatan?: string | null }
) {
    try {
        const existing = await prisma.document.findUnique({
            where: { id },
            select: { clientId: true },
        });
        if (!existing) return { success: false, error: "Dokumen tidak ditemukan" };

        await assertCanAccessClient(existing.clientId);

        const document = await prisma.document.update({
            where: { id },
            data,
        });

        revalidatePath("/dashboard/documents");
        return { success: true, data: document };
    } catch (error) {
        console.error("updateDocument error:", error);
        return handleAuthError(error);
    }
}

// ─── DELETE DOCUMENT ─────────────────────────────────────────────────────────

export async function deleteDocument(id: string) {
    try {
        const document = await prisma.document.findUnique({
            where: { id },
            select: { fileUrl: true, clientId: true },
        });

        if (!document) return { success: false, error: "Dokumen tidak ditemukan" };

        await assertCanAccessClient(document.clientId);

        // Hapus dari R2 jika ada fileUrl
        if (document.fileUrl) {
            const key = extractR2Key(document.fileUrl);
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })
            );
        }

        // Soft delete (middleware intercepts delete and sets deletedAt)
        await prisma.document.delete({
            where: { id },
        });

        revalidatePath("/dashboard/documents");
        return { success: true };
    } catch (error) {
        console.error("deleteDocument error:", error);
        return handleAuthError(error);
    }
}

// ─── HARD DELETE (admin only) ────────────────────────────────────────────────

export async function hardDeleteDocument(id: string) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Akses ditolak." };

        const document = await prisma.document.findUnique({
            where: { id },
            select: { fileUrl: true },
        });

        if (!document) return { success: false, error: "Dokumen tidak ditemukan" };

        if (document.fileUrl) {
            const key = extractR2Key(document.fileUrl);
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })
            );
        }

        await prisma.document.delete({ where: { id } });

        revalidatePath("/dashboard/documents");
        return { success: true };
    } catch (error) {
        console.error("hardDeleteDocument error:", error);
        return handleAuthError(error);
    }
}
