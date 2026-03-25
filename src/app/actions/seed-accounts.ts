"use server";

import { prisma } from "@/lib/prisma";
import { isAdminOrStaff } from "@/lib/auth-helpers";
import { COA_TEMPLATES, getTemplate } from "@/lib/coa-templates";

export async function seedAccounts(
    clientId?: string,
    force: boolean = false,
    templateId: string = "hotel-restoran"
) {
    try {
        // Auth: only admin/staff can seed accounts
        const admin = await isAdminOrStaff();
        if (!admin) {
            return { success: false, error: "Akses ditolak. Hanya admin yang dapat melakukan operasi ini." };
        }

        const template = getTemplate(templateId);
        if (!template) {
            return { success: false, error: `Template "${templateId}" tidak ditemukan.` };
        }

        const resolvedClientId = clientId || null;

        const existing = await prisma.account.count({
            where: { clientId: resolvedClientId },
        });

        if (existing > 0 && !force) {
            return { success: true, message: "Accounts already exist" };
        }

        let skipped = 0;
        if (force) {
            // Find accounts that have journal items — deactivate instead of deleting
            const usedAccounts = await prisma.journalItem.groupBy({
                by: ["accountId"],
                where: {
                    account: { clientId: resolvedClientId },
                },
            });
            const usedIds = new Set(usedAccounts.map((a) => a.accountId));

            if (usedIds.size > 0) {
                // Deactivate accounts with journal entries (preserve data integrity)
                await prisma.account.updateMany({
                    where: {
                        clientId: resolvedClientId,
                        id: { in: [...usedIds] },
                    },
                    data: { isActive: false },
                });
                skipped = usedIds.size;
            }

            // Only delete accounts without journal entries
            await prisma.account.deleteMany({
                where: {
                    clientId: resolvedClientId,
                    id: { notIn: [...usedIds] },
                },
            });
        }

        await prisma.$transaction(
            template.accounts.map((acc) =>
                prisma.account.create({
                    data: {
                        code: acc.code,
                        name: acc.name,
                        type: acc.type,
                        isActive: true,
                        clientId: resolvedClientId,
                    },
                })
            )
        );

        const msg = skipped > 0
            ? `${template.accounts.length} akun (${template.name}) dibuat. ${skipped} akun lama dinonaktifkan (memiliki transaksi jurnal).`
            : `${template.accounts.length} akun (${template.name}) berhasil dibuat.`;

        return { success: true, message: msg };
    } catch (error: unknown) {
        console.error("seedAccounts error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Gagal seed akun: ${msg}` };
    }
}

/** Return available templates for the UI (no auth required for listing). */
export async function getCoaTemplates() {
    return COA_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        accountCount: t.accounts.length,
    }));
}
