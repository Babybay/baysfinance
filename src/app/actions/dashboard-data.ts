"use server";

import { prisma } from "@/lib/prisma";
import type { Invoice, TaxDeadline, Client } from "@prisma/client";

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
        let rawDeadlines: any[] = [];

        if (role === "admin") {
            // Fetch all for admin
            clients = await prisma.client.findMany({
                orderBy: { createdAt: "desc" }
            });
            invoices = await prisma.invoice.findMany({
                where: { client: { deletedAt: null } },
                orderBy: { tanggal: "desc" },
                take: 50 // Increased for monthly revenue calculation
            });
            rawDeadlines = await prisma.taxDeadline.findMany({
                where: { client: { deletedAt: null } },
                include: { client: true },
                orderBy: { tanggalBatas: "asc" }
            });
        } else if (clientId) {
            // Fetch only for specific client
            clients = await prisma.client.findMany({ where: { id: clientId } });
            invoices = await prisma.invoice.findMany({
                where: { clientId },
                orderBy: { tanggal: "desc" },
                take: 50
            });
            rawDeadlines = await prisma.taxDeadline.findMany({
                where: { clientId },
                include: { client: true },
                orderBy: { tanggalBatas: "asc" }
            });
        }

        const deadlines = rawDeadlines.map(d => ({
            ...d,
            clientName: d.client?.nama || "Unknown Client"
        }));

        // --- Enhanced data for admin ---
        let permitSummary: PermitSummary = { total: 0, byStatus: {} };
        let monthlyRevenue: MonthlyRevenue[] = [];
        let recentActivity: RecentActivity[] = [];
        let documentCount = 0;
        let importBatchCount = 0;

        if (role === "admin") {
            // Permit summary
            try {
                const permits = await prisma.permitCase.findMany({
                    select: { status: true },
                });
                permitSummary.total = permits.length;
                for (const p of permits) {
                    permitSummary.byStatus[p.status] = (permitSummary.byStatus[p.status] || 0) + 1;
                }
            } catch { /* permits table may not exist yet */ }

            // Monthly revenue (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const paidInvoices = invoices.filter(
                (i) => i.status === "Lunas" && new Date(i.tanggal) >= sixMonthsAgo
            );

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

            // Document count
            try {
                documentCount = await prisma.document.count();
            } catch { /* */ }

            // Import batch count
            try {
                importBatchCount = await prisma.importBatch.count();
            } catch { /* */ }

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

            // Recent permits
            try {
                const recentPermits = await prisma.permitCase.findMany({
                    include: { client: true, permitType: true },
                    orderBy: { updatedAt: "desc" },
                    take: 5,
                });
                for (const p of recentPermits) {
                    activities.push({
                        id: p.id,
                        type: "permit",
                        description: `${p.caseId} — ${p.client?.nama || "Unknown"}`,
                        timestamp: p.updatedAt.toISOString(),
                        meta: p.status,
                    });
                }
            } catch { /* */ }

            // Recent imports
            try {
                const recentImports = await prisma.importBatch.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 3,
                });
                for (const ib of recentImports) {
                    activities.push({
                        id: ib.id,
                        type: "import",
                        description: `Import: ${ib.fileName}`,
                        timestamp: ib.createdAt.toISOString(),
                        meta: `${ib.entriesCount} entries`,
                    });
                }
            } catch { /* */ }

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
