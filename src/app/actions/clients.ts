"use server";

import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";

export async function getClients() {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: clients };
    } catch (error) {
        console.error("Error fetching clients:", error);
        return { success: false, data: [] };
    }
}

export async function createClient(data: Omit<Client, "id" | "createdAt">) {
    try {
        const newClient = await prisma.client.create({ data });
        return { success: true, data: newClient };
    } catch (error) {
        console.error("Error creating client:", error);
        return { success: false, error: "Gagal menambahkan klien" };
    }
}

export async function updateClient(id: string, data: Partial<Client>) {
    try {
        const updatedClient = await prisma.client.update({
            where: { id },
            data
        });
        return { success: true, data: updatedClient };
    } catch (error) {
        console.error("Error updating client:", error);
        return { success: false, error: "Gagal memperbarui klien" };
    }
}

export async function deleteClient(id: string) {
    try {
        await prisma.client.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("Error deleting client:", error);
        return { success: false, error: "Gagal menghapus klien" };
    }
}
