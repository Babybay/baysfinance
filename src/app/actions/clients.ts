"use server";

import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";
import {
    assertCanAccessClient,
    getCurrentUser,
    getOwnClientId,
    handleAuthError,
} from "@/lib/auth-helpers";
import { generateDeadlinesForClient } from "@/lib/tax-deadline-templates";

export async function getClients() {
    try {
        const user = await getCurrentUser();
        const admin = user?.role === "Admin" || user?.role === "Staff";

        if (admin) {
            // Agency users see sub-accounts inside their agency. A user without
            // organisationId acts as a super-admin during setup/migration.
            const clients = await prisma.client.findMany({
                where: user.organisationId ? { organisationId: user.organisationId } : undefined,
                orderBy: { createdAt: "desc" }
            });
            return { success: true, data: clients };
        }

        // Client-role user: return only their own client
        const ownClientId = await getOwnClientId();
        if (!ownClientId) return { success: true, data: [] };

        const client = await prisma.client.findUnique({ where: { id: ownClientId } });
        return { success: true, data: client ? [client] : [] };
    } catch (error) {
        console.error("Error fetching clients:", error);
        return { ...handleAuthError(error), data: [] };
    }
}

export async function createClient(data: Omit<Client, "id" | "createdAt" | "updatedAt" | "deletedAt">) {
    try {
        const user = await getCurrentUser();
        const admin = user?.role === "Admin" || user?.role === "Staff";
        if (!admin || !user) return { success: false, error: "Akses ditolak." };

        const newClient = await prisma.client.create({
            data: {
                ...data,
                organisationId: user.organisationId ?? data.organisationId ?? null,
            },
        });

        // Auto-seed tax deadlines for new client
        try {
            const deadlines = generateDeadlinesForClient(newClient.id, newClient.jenisWP);
            if (deadlines.length > 0) {
                await prisma.taxDeadline.createMany({ data: deadlines });
            }
        } catch (deadlineError) {
            console.error("Auto-seed deadlines error:", deadlineError);
            // Don't fail client creation if deadline seeding fails
        }

        return { success: true, data: newClient };
    } catch (error) {
        console.error("Error creating client:", error);
        return handleAuthError(error);
    }
}

export async function updateClient(id: string, data: Partial<Client>) {
    try {
        const user = await getCurrentUser();
        const admin = user?.role === "Admin" || user?.role === "Staff";
        if (!admin || !user) return { success: false, error: "Akses ditolak." };

        if (user.organisationId) {
            const existing = await prisma.client.findUnique({
                where: { id },
                select: { organisationId: true },
            });
            if (!existing || existing.organisationId !== user.organisationId) {
                return { success: false, error: "Akses ditolak." };
            }
        }

        const EDITABLE_FIELDS = ["nama", "npwp", "jenisWP", "email", "telepon", "alamat", "status"] as const;
        const safeData: Partial<Client> = {};
        for (const field of EDITABLE_FIELDS) {
            if (field in data) (safeData as Record<string, unknown>)[field] = data[field];
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: safeData
        });
        return { success: true, data: updatedClient };
    } catch (error) {
        console.error("Error updating client:", error);
        return handleAuthError(error);
    }
}

export async function deleteClient(id: string) {
    try {
        const user = await getCurrentUser();
        const admin = user?.role === "Admin" || user?.role === "Staff";
        if (!admin || !user) return { success: false, error: "Akses ditolak." };

        if (user.organisationId) {
            const existing = await prisma.client.findUnique({
                where: { id },
                select: { organisationId: true },
            });
            if (!existing || existing.organisationId !== user.organisationId) {
                return { success: false, error: "Akses ditolak." };
            }
        }

        await prisma.client.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("Error deleting client:", error);
        return handleAuthError(error);
    }
}

export async function getClientDetail(id: string) {
    try {
        // Admins can see any client; client-role users can only see their own
        await assertCanAccessClient(id);

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                invoices: { orderBy: { tanggal: "desc" }, take: 10, include: { items: true } },
                deadlines: { orderBy: { tanggalBatas: "asc" } },
                documents: { orderBy: { tanggalUpload: "desc" }, take: 10 },
                permits: { orderBy: { createdAt: "desc" }, take: 5, include: { permitType: true } },
            },
        });
        if (!client) return { success: false, error: "Client not found" };
        return { success: true, data: client };
    } catch (error) {
        console.error("getClientDetail error:", error);
        return handleAuthError(error);
    }
}
