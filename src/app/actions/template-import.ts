"use server";

import { currentUser } from "@clerk/nextjs/server";
import { assertCanAccessClient, handleAuthError, isAdminOrStaff } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

const INGESTION_URL = process.env.INGESTION_SERVICE_URL || "http://localhost:8001";

// ── IMPORT SINGLE FILE ──────────────────────────────────────────────────────

export async function importTemplateFile(formData: FormData) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Sesi tidak valid." };

        const clientId = formData.get("clientId") as string;
        if (!clientId) return { success: false, error: "Client ID diperlukan." };

        await assertCanAccessClient(clientId);

        const file = formData.get("file") as File;
        if (!file) return { success: false, error: "File tidak ditemukan." };

        // Forward to Python service
        const pyForm = new FormData();
        pyForm.append("file", file);
        pyForm.append("client_id", clientId);
        pyForm.append("imported_by", user.fullName || user.emailAddresses[0]?.emailAddress || "Unknown");

        const res = await fetch(`${INGESTION_URL}/process`, {
            method: "POST",
            body: pyForm,
        });

        if (!res.ok) {
            const errText = await res.text();
            return { success: false, error: `Ingestion service error: ${errText}` };
        }

        const data = await res.json();
        revalidatePath("/dashboard/accounting");
        return { success: data.success, data, error: data.errors?.[0] };
    } catch (error) {
        console.error("[importTemplateFile]", error);
        return handleAuthError(error);
    }
}

// ── GET IMPORT HISTORY ──────────────────────────────────────────────────────

export async function getImportBatches(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const res = await fetch(`${INGESTION_URL}/batches/${clientId}`);
        if (!res.ok) return { success: false, data: [] };

        const result = await res.json();
        return { success: true, data: result.data || [] };
    } catch (error) {
        console.error("[getImportBatches]", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ── ROLLBACK BATCH ──────────────────────────────────────────────────────────

export async function rollbackImportBatch(batchId: string) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Hanya admin yang dapat melakukan rollback." };

        const res = await fetch(`${INGESTION_URL}/rollback/${batchId}`, {
            method: "POST",
        });

        if (!res.ok) {
            return { success: false, error: "Gagal melakukan rollback." };
        }

        const data = await res.json();
        revalidatePath("/dashboard/accounting");
        return { success: data.success, error: data.success ? undefined : data.message };
    } catch (error) {
        console.error("[rollbackImportBatch]", error);
        return handleAuthError(error);
    }
}
