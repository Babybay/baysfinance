"use server";

import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";
import {
    assertCanAccessClient,
    getOwnClientId,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";

export async function getClients() {
    try {
        const admin = await isAdminOrStaff();
        if (admin) {
            // Admin/staff sees all clients
            const clients = await prisma.client.findMany({
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
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Akses ditolak." };

        const newClient = await prisma.client.create({ data });
        return { success: true, data: newClient };
    } catch (error) {
        console.error("Error creating client:", error);
        return handleAuthError(error);
    }
}

export async function updateClient(id: string, data: Partial<Client>) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Akses ditolak." };

        const updatedClient = await prisma.client.update({
            where: { id },
            data
        });
        return { success: true, data: updatedClient };
    } catch (error) {
        console.error("Error updating client:", error);
        return handleAuthError(error);
    }
}

export async function deleteClient(id: string) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Akses ditolak." };

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
