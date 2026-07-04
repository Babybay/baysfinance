"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, handleAuthError } from "@/lib/auth-helpers";
import { InvoiceStatus } from "@prisma/client";
import { STANDARD_ACCOUNTS } from "@/lib/tax-config";

const REQUIRED_INVOICE_ACCOUNT_CODES = [
    STANDARD_ACCOUNTS.PIUTANG_USAHA,
    STANDARD_ACCOUNTS.PENDAPATAN_JASA,
    STANDARD_ACCOUNTS.PPN_KELUARAN,
    STANDARD_ACCOUNTS.BANK,
];

export interface InvoiceAuditRow {
    id: string;
    nomorInvoice: string;
    ledgerCompany: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    subtotal: number;
    ppn: number;
    total: number;
    paid: number;
    outstanding: number;
    sentJournalRef: string | null;
    paymentJournalCount: number;
    reversalJournalCount: number;
    balancedJournalCount: number;
    unbalancedJournalCount: number;
    issues: string[];
}

export interface InvoiceAuditClient {
    id: string;
    name: string;
    missingAccounts: string[];
}

export interface InvoiceAuditSummary {
    totalInvoices: number;
    invoicesNeedingPosting: number;
    missingPosting: number;
    totalRevenue: number;
    ppnLiability: number;
    accountsReceivable: number;
    cashCollected: number;
    unbalancedJournals: number;
    clientsWithMissingAccounts: number;
}

export async function getInvoiceAccountingAudit() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Sesi tidak valid.", data: null };
        }

        const isAgency = user.role === "Admin" || user.role === "Staff";
        const clients = await prisma.client.findMany({
            where: isAgency
                ? user.organisationId
                    ? { organisationId: user.organisationId }
                    : undefined
                : user.clientId
                    ? { id: user.clientId }
                    : { id: "__none__" },
            select: { id: true, nama: true },
            orderBy: { nama: "asc" },
        });

        const clientIds = clients.map((client) => client.id);
        if (clientIds.length === 0) {
            return {
                success: true,
                data: {
                    summary: {
                        totalInvoices: 0,
                        invoicesNeedingPosting: 0,
                        missingPosting: 0,
                        totalRevenue: 0,
                        ppnLiability: 0,
                        accountsReceivable: 0,
                        cashCollected: 0,
                        unbalancedJournals: 0,
                        clientsWithMissingAccounts: 0,
                    } satisfies InvoiceAuditSummary,
                    clients: [] as InvoiceAuditClient[],
                    rows: [] as InvoiceAuditRow[],
                },
            };
        }

        const [invoices, accounts, journals] = await Promise.all([
            prisma.invoice.findMany({
                where: { clientId: { in: clientIds } },
                include: {
                    client: { select: { nama: true } },
                    payments: true,
                },
                orderBy: { tanggal: "desc" },
            }),
            prisma.account.findMany({
                where: {
                    code: { in: REQUIRED_INVOICE_ACCOUNT_CODES },
                    OR: [{ clientId: null }, { clientId: { in: clientIds } }],
                    isActive: true,
                },
                select: { code: true, clientId: true },
            }),
            prisma.journalEntry.findMany({
                where: {
                    clientId: { in: clientIds },
                    invoiceId: { not: null },
                    source: {
                        in: ["auto_invoice", "auto_invoice_reversal", "auto_payment", "auto_payment_reversal"],
                    },
                    deletedAt: null,
                },
                include: { items: true },
                orderBy: { date: "desc" },
            }),
        ]);

        const sharedAccountCodes = new Set(
            accounts
                .filter((account) => account.clientId === null)
                .map((account) => account.code),
        );
        const accountCodesByClient = new Map<string, Set<string>>();
        for (const client of clients) {
            accountCodesByClient.set(client.id, new Set(sharedAccountCodes));
        }
        for (const account of accounts) {
            if (!account.clientId) continue;
            accountCodesByClient.get(account.clientId)?.add(account.code);
        }

        const clientAudit = clients.map((client) => {
            const codes = accountCodesByClient.get(client.id) ?? new Set<string>();
            return {
                id: client.id,
                name: client.nama,
                missingAccounts: REQUIRED_INVOICE_ACCOUNT_CODES.filter((code) => !codes.has(code)),
            };
        });

        const isBalanced = (journal: (typeof journals)[number]) => {
            const debit = journal.items.reduce((sum, item) => sum + Number(item.debit), 0);
            const credit = journal.items.reduce((sum, item) => sum + Number(item.credit), 0);
            return Math.abs(debit - credit) <= 0.001;
        };

        const journalsByInvoiceId = new Map<string, typeof journals>();
        for (const journal of journals) {
            if (!journal.invoiceId) continue;
            const list = journalsByInvoiceId.get(journal.invoiceId);
            if (list) list.push(journal);
            else journalsByInvoiceId.set(journal.invoiceId, [journal]);
        }

        const rows: InvoiceAuditRow[] = invoices.map((invoice) => {
            const relatedJournals = journalsByInvoiceId.get(invoice.id) ?? [];
            const sentJournals = relatedJournals.filter((journal) => journal.source === "auto_invoice");
            const paymentJournals = relatedJournals.filter((journal) => journal.source === "auto_payment");
            const reversalJournals = relatedJournals.filter((journal) =>
                journal.source === "auto_invoice_reversal" || journal.source === "auto_payment_reversal",
            );
            const balancedJournalCount = relatedJournals.filter(isBalanced).length;
            const unbalancedJournalCount = relatedJournals.length - balancedJournalCount;

            const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.jumlah), 0);
            const total = Number(invoice.total);
            const outstanding = Math.max(0, total - paid);
            const issues: string[] = [];

            const clientAccounts = clientAudit.find((client) => client.id === invoice.clientId);
            if (clientAccounts && clientAccounts.missingAccounts.length > 0) {
                issues.push(`Missing COA: ${clientAccounts.missingAccounts.join(", ")}`);
            }

            if (invoice.status !== InvoiceStatus.Draft && sentJournals.length === 0) {
                issues.push("No AR/revenue/PPN posting journal");
            }

            if (invoice.status === InvoiceStatus.Lunas && paid < total - 0.01) {
                issues.push("Marked paid but payment total is lower than invoice total");
            }

            if (paid > 0 && paymentJournals.length === 0) {
                issues.push("Payment exists without bank/AR journal");
            }

            if (unbalancedJournalCount > 0) {
                issues.push("Related journal is not balanced");
            }

            return {
                id: invoice.id,
                nomorInvoice: invoice.nomorInvoice,
                ledgerCompany: invoice.client?.nama ?? invoice.clientName,
                status: invoice.status,
                issueDate: invoice.tanggal.toISOString(),
                dueDate: invoice.jatuhTempo.toISOString(),
                subtotal: Number(invoice.subtotal),
                ppn: Number(invoice.ppn),
                total,
                paid,
                outstanding,
                sentJournalRef: sentJournals[0]?.refNumber ?? null,
                paymentJournalCount: paymentJournals.length,
                reversalJournalCount: reversalJournals.length,
                balancedJournalCount,
                unbalancedJournalCount,
                issues,
            };
        });

        const summary: InvoiceAuditSummary = {
            totalInvoices: rows.length,
            invoicesNeedingPosting: rows.filter((row) => row.status !== InvoiceStatus.Draft).length,
            missingPosting: rows.filter((row) =>
                row.status !== InvoiceStatus.Draft && !row.sentJournalRef,
            ).length,
            totalRevenue: rows
                .filter((row) => row.status !== InvoiceStatus.Draft)
                .reduce((sum, row) => sum + row.subtotal, 0),
            ppnLiability: rows
                .filter((row) => row.status !== InvoiceStatus.Draft)
                .reduce((sum, row) => sum + row.ppn, 0),
            accountsReceivable: rows.reduce((sum, row) => sum + row.outstanding, 0),
            cashCollected: rows.reduce((sum, row) => sum + row.paid, 0),
            unbalancedJournals: rows.reduce((sum, row) => sum + row.unbalancedJournalCount, 0),
            clientsWithMissingAccounts: clientAudit.filter((client) => client.missingAccounts.length > 0).length,
        };

        return { success: true, data: { summary, clients: clientAudit, rows } };
    } catch (error) {
        console.error("getInvoiceAccountingAudit error:", error);
        return { ...handleAuthError(error), data: null };
    }
}
