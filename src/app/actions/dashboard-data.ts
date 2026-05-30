"use server";

import { prisma } from "@/lib/prisma";
import type { Invoice, TaxDeadline, Client } from "@prisma/client";

type DeadlineWithClient = TaxDeadline & {
    client?: { nama: string } | null;
};

export interface PermitSummary {
    total: number;
    byStatus: Record<string, number>;
}

export interface MonthlyRevenue {
    month: string; // "2026-01"
    revenue: number;
    invoiceCount: number;
}

export interface RecentActivity {
    id: string;
    type: "invoice" | "deadline" | "permit" | "document" | "import";
    description: string;
    timestamp: string;
    meta?: string;
}

export async function getDashboardData(clientId?: string, role: string = "admin") {
    try {
        let clients: Client[] = [];
        let invoices: Invoice[] = [];
        let rawDeadlines: DeadlineWithClient[] = [];

        if (role === "admin") {
            [clients, invoices, rawDeadlines] = await Promise.all([
                prisma.client.findMany({
                    orderBy: { createdAt: "desc" },
                }),
                prisma.invoice.findMany({
                    where: { client: { deletedAt: null } },
                    orderBy: { tanggal: "desc" },
                    take: 50,
                }),
                prisma.taxDeadline.findMany({
                    where: { client: { deletedAt: null } },
                    include: { client: { select: { nama: true } } },
                    orderBy: { tanggalBatas: "asc" },
                }),
            ]);
        } else if (clientId) {
            [clients, invoices, rawDeadlines] = await Promise.all([
                prisma.client.findMany({ where: { id: clientId } }),
                prisma.invoice.findMany({
                    where: { clientId },
                    orderBy: { tanggal: "desc" },
                    take: 50,
                }),
                prisma.taxDeadline.findMany({
                    where: { clientId },
                    include: { client: { select: { nama: true } } },
                    orderBy: { tanggalBatas: "asc" },
                }),
            ]);
        }

        const deadlines = rawDeadlines.map(d => ({
            ...d,
            clientName: d.client?.nama || "Unknown Client"
        }));

        // --- Enhanced data for admin ---
        const permitSummary: PermitSummary = { total: 0, byStatus: {} };
        let monthlyRevenue: MonthlyRevenue[] = [];
        let recentActivity: RecentActivity[] = [];
        let documentCount = 0;
        let importBatchCount = 0;

        if (role === "admin") {
            // Monthly revenue (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const [
                permitStatusGroups,
                paidInvoices,
                documentCountResult,
                importBatchCountResult,
                recentPermits,
                recentImports,
            ] = await Promise.all([
                prisma.permitCase.groupBy({
                    by: ["status"],
                    _count: { _all: true },
                }).catch(() => []),
                prisma.invoice.findMany({
                    where: {
                        status: "Lunas",
                        tanggal: { gte: sixMonthsAgo },
                        client: { deletedAt: null },
                    },
                    select: { tanggal: true, total: true },
                    orderBy: { tanggal: "asc" },
                }),
                prisma.document.count().catch(() => 0),
                prisma.importBatch.count().catch(() => 0),
                prisma.permitCase.findMany({
                    include: { client: { select: { nama: true } }, permitType: true },
                    orderBy: { updatedAt: "desc" },
                    take: 5,
                }).catch(() => []),
                prisma.importBatch.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 3,
                }).catch(() => []),
            ]);

            for (const group of permitStatusGroups) {
                const count = group._count._all;
                permitSummary.total += count;
                permitSummary.byStatus[group.status] = count;
            }

            const revenueByMonth: Record<string, { revenue: number; count: number }> = {};
            for (const inv of paidInvoices) {
                const d = new Date(inv.tanggal);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!revenueByMonth[key]) revenueByMonth[key] = { revenue: 0, count: 0 };
                revenueByMonth[key].revenue += Number(inv.total);
                revenueByMonth[key].count += 1;
            }

            monthlyRevenue = Object.entries(revenueByMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, data]) => ({
                    month,
                    revenue: data.revenue,
                    invoiceCount: data.count,
                }));

            documentCount = documentCountResult;
            importBatchCount = importBatchCountResult;

            // Recent activity (composite from multiple sources)
            const activities: RecentActivity[] = [];

            // Recent invoices
            for (const inv of invoices.slice(0, 5)) {
                activities.push({
                    id: inv.id,
                    type: "invoice",
                    description: `Invoice ${inv.nomorInvoice}`,
                    timestamp: new Date(inv.tanggal).toISOString(),
                    meta: inv.status,
                });
            }

            // Recent deadlines
            for (const dl of deadlines.slice(0, 5)) {
                activities.push({
                    id: dl.id,
                    type: "deadline",
                    description: `${dl.jenisPajak} — ${dl.clientName}`,
                    timestamp: new Date(dl.tanggalBatas).toISOString(),
                    meta: dl.status,
                });
            }

            for (const p of recentPermits) {
                activities.push({
                    id: p.id,
                    type: "permit",
                    description: `${p.caseId} — ${p.client?.nama || "Unknown"}`,
                    timestamp: p.updatedAt.toISOString(),
                    meta: p.status,
                });
            }

            for (const ib of recentImports) {
                activities.push({
                    id: ib.id,
                    type: "import",
                    description: `Import: ${ib.fileName}`,
                    timestamp: ib.createdAt.toISOString(),
                    meta: `${ib.entriesCount} entries`,
                });
            }

            // Sort all by timestamp desc
            recentActivity = activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10);
        }

        return {
            success: true,
            data: {
                clients,
                invoices,
                deadlines,
                permitSummary,
                monthlyRevenue,
                recentActivity,
                documentCount,
                importBatchCount,
            },
        };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return {
            success: false,
            data: {
                clients: [],
                invoices: [],
                deadlines: [],
                permitSummary: { total: 0, byStatus: {} },
                monthlyRevenue: [],
                recentActivity: [],
                documentCount: 0,
                importBatchCount: 0,
            },
            error: "Gagal mengambil data dashboard",
        };
    }
}
