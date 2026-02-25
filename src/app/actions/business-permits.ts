"use server";

import { prisma } from "@/lib/prisma";

// ─── GET ALL PERMITS ─────────────────────────────────────────────────────────

export async function getPermits(clientId?: string) {
    try {
        const permits = await prisma.businessPermitCase.findMany({
            where: clientId ? { clientId } : undefined,
            orderBy: { updatedAt: "desc" },
        });
        return { success: true, data: permits };
    } catch (error) {
        console.error("getPermits error:", error);
        return { success: false, data: [] };
    }
}

// ─── GET SINGLE PERMIT ───────────────────────────────────────────────────────

export async function getPermitById(id: string) {
    try {
        const permit = await prisma.businessPermitCase.findUnique({
            where: { id },
            include: { documents: true },
        });
        return { success: true, data: permit };
    } catch (error) {
        console.error("getPermitById error:", error);
        return { success: false, data: null };
    }
}

// ─── UPDATE PERMIT STATUS ────────────────────────────────────────────────────

export async function updatePermitStatus(id: string, status: string, progress: number) {
    try {
        const permit = await prisma.businessPermitCase.update({
            where: { id },
            data: { status, progress },
        });
        return { success: true, data: permit };
    } catch (error) {
        console.error("updatePermitStatus error:", error);
        return { success: false, error: "Gagal mengupdate status perijinan" };
    }
}
