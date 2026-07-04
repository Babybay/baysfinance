"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, handleAuthError } from "@/lib/auth-helpers";
import { ClientStatus, InvoiceStatus, TaxDeadlineStatus } from "@prisma/client";

export interface AgencySubAccount {
    id: string;
    name: string;
    npwp: string;
    email: string;
    status: ClientStatus;
    type: string;
    users: number;
    invoices: number;
    documents: number;
    permits: number;
    openDeadlines: number;
    revenue: number;
    outstanding: number;
    createdAt: string;
}

export interface AgencyOverview {
    agencyName: string;
    agencySlug: string;
    userRole: string;
    totalSubAccounts: number;
    activeSubAccounts: number;
    agencyUsers: number;
    clientPortalUsers: number;
    openDeadlines: number;
    activePermits: number;
    monthlyRevenue: number;
    outstanding: number;
    subAccounts: AgencySubAccount[];
}

export async function getAgencyOverview() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "Admin" && user.role !== "Staff")) {
            return { success: false, error: "Akses ditolak.", data: null };
        }

        const clientWhere = user.organisationId ? { organisationId: user.organisationId } : undefined;
        const userWhere = user.organisationId ? { organisationId: user.organisationId } : undefined;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [organisation, clients, agencyUsers, clientPortalUsers, openDeadlines, activePermits, invoiceSums, paidThisMonthSum] =
            await Promise.all([
                user.organisationId
                    ? prisma.organisation.findUnique({
                        where: { id: user.organisationId },
                        select: { name: true, slug: true },
                    })
                    : null,
                prisma.client.findMany({
                    where: clientWhere,
                    orderBy: { createdAt: "desc" },
                    include: {
                        _count: {
                            select: {
                                users: true,
                                invoices: true,
                                documents: true,
                                permits: true,
                                deadlines: {
                                    where: {
                                        status: {
                                            in: [TaxDeadlineStatus.BelumLapor, TaxDeadlineStatus.Terlambat],
                                        },
                                    },
                                },
                            },
                        },
                    },
                }),
                prisma.user.count({
                    where: {
                        ...userWhere,
                        role: { in: ["Admin", "Staff"] },
                    },
                }),
                prisma.user.count({
                    where: {
                        ...userWhere,
                        role: "Client",
                    },
                }),
                prisma.taxDeadline.count({
                    where: {
                        status: { in: [TaxDeadlineStatus.BelumLapor, TaxDeadlineStatus.Terlambat] },
                        client: clientWhere,
                    },
                }),
                prisma.permitCase.count({
                    where: {
                        status: { in: ["WaitingDocument", "Verification", "RevisionRequired", "Processing", "OnHold"] },
                        client: clientWhere,
                    },
                }),
                // Per-client, per-status invoice totals summed in the DB —
                // replaces loading every invoice row and reducing in JS.
                prisma.invoice.groupBy({
                    by: ["clientId", "status"],
                    where: {
                        status: { in: [InvoiceStatus.Lunas, InvoiceStatus.Terkirim, InvoiceStatus.JatuhTempo] },
                        client: clientWhere,
                    },
                    _sum: { total: true },
                }),
                prisma.invoice.aggregate({
                    where: {
                        status: InvoiceStatus.Lunas,
                        tanggal: { gte: monthStart },
                        client: clientWhere,
                    },
                    _sum: { total: true },
                }),
            ]);

        const revenueByClient = new Map<string, number>();
        const outstandingByClient = new Map<string, number>();
        for (const group of invoiceSums) {
            const sum = Number(group._sum.total ?? 0);
            if (group.status === InvoiceStatus.Lunas) {
                revenueByClient.set(group.clientId, (revenueByClient.get(group.clientId) ?? 0) + sum);
            } else {
                outstandingByClient.set(group.clientId, (outstandingByClient.get(group.clientId) ?? 0) + sum);
            }
        }

        const subAccounts = clients.map((client) => {
            const revenue = revenueByClient.get(client.id) ?? 0;
            const outstanding = outstandingByClient.get(client.id) ?? 0;

            return {
                id: client.id,
                name: client.nama,
                npwp: client.npwp,
                email: client.email,
                status: client.status,
                type: client.jenisWP,
                users: client._count.users,
                invoices: client._count.invoices,
                documents: client._count.documents,
                permits: client._count.permits,
                openDeadlines: client._count.deadlines,
                revenue,
                outstanding,
                createdAt: client.createdAt.toISOString(),
            };
        });

        const monthlyRevenue = Number(paidThisMonthSum._sum.total ?? 0);
        let outstanding = 0;
        for (const value of outstandingByClient.values()) outstanding += value;

        return {
            success: true,
            data: {
                agencyName: organisation?.name ?? "Agency Workspace",
                agencySlug: organisation?.slug ?? "unassigned-agency",
                userRole: user.role,
                totalSubAccounts: clients.length,
                activeSubAccounts: clients.filter((client) => client.status === ClientStatus.Aktif).length,
                agencyUsers,
                clientPortalUsers,
                openDeadlines,
                activePermits,
                monthlyRevenue,
                outstanding,
                subAccounts,
            } satisfies AgencyOverview,
        };
    } catch (error) {
        console.error("getAgencyOverview error:", error);
        return { ...handleAuthError(error), data: null };
    }
}
