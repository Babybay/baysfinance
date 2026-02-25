"use server";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

// ─── GET ALL DOCUMENTS ───────────────────────────────────────────────────────

export async function getDocuments(clientId?: string) {
    try {
        const documents = await prisma.document.findMany({
            where: clientId ? { clientId } : undefined,
            orderBy: { tanggalUpload: "desc" },
        });
        return { success: true, data: documents };
    } catch (error) {
        console.error("getDocuments error:", error);
        return { success: false, error: "Gagal mengambil data dokumen" };
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

        if (!file || !nama || !kategori || !clientId) {
            return { success: false, error: "Data tidak lengkap" };
        }

        // Get client name
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        // Build unique key
        const ext = file.name.split(".").pop();
        const key = `documents/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Upload to R2
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
        const ukuran = formatFileSize(file.size);

        // Save to DB
        const document = await prisma.document.create({
            data: {
                nama,
                kategori,
                clientId,
                clientName: client.nama,
                ukuran,
                catatan: catatan || null,
                // Store fileUrl in a field - add this to your schema if not present
                // fileUrl, // uncomment after adding field to schema
            },
        });

        revalidatePath("/dashboard/documents");
        return { success: true, data: { ...document, fileUrl } };
    } catch (error) {
        console.error("uploadDocument error:", error);
        return { success: false, error: "Gagal mengupload dokumen" };
    }
}

// ─── DELETE DOCUMENT ─────────────────────────────────────────────────────────

export async function deleteDocument(id: string, fileKey?: string) {
    try {
        // Delete from R2 if key provided
        if (fileKey) {
            await R2.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: fileKey,
                })
            );
        }

        // Delete from DB
        await prisma.document.delete({ where: { id } });

        revalidatePath("/dashboard/documents");
        return { success: true };
    } catch (error) {
        console.error("deleteDocument error:", error);
        return { success: false, error: "Gagal menghapus dokumen" };
    }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}