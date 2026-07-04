import Link from "next/link";
import { AlertTriangle, ArrowLeft, BookOpenCheck, CheckCircle2, CircleDollarSign, FileWarning, Landmark, ReceiptText } from "lucide-react";
import { getInvoiceAccountingAudit } from "@/app/actions/invoice-audit";
import { Badge } from "@/components/ui/Badge";
import { formatIDR } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default async function InvoiceAccountingAuditPage() {
    const response = await getInvoiceAccountingAudit();

    if (!response.success || !response.data) {
        return (
            <div className="rounded-[16px] border border-border bg-card p-8">
                <Link href="/dashboard/invoices" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to invoices
                </Link>
                <h1 className="font-serif text-2xl text-foreground">Invoice Accounting Audit</h1>
                <p className="mt-2 text-sm text-muted-foreground">{response.error || "Audit data could not be loaded."}</p>
            </div>
        );
    }

    const { summary, clients, rows } = response.data;
    const exceptionRows = rows.filter((row) => row.issues.length > 0);

    const metrics = [
        {
            label: "Posted revenue",
            value: formatIDR(summary.totalRevenue),
            hint: "Non-draft invoice subtotal",
            icon: CircleDollarSign,
        },
        {
            label: "PPN output",
            value: formatIDR(summary.ppnLiability),
            hint: "Liability created by issued invoices",
            icon: Landmark,
        },
        {
            label: "Accounts receivable",
            value: formatIDR(summary.accountsReceivable),
            hint: "Open invoice balance",
            icon: ReceiptText,
        },
        {
            label: "Cash collected",
            value: formatIDR(summary.cashCollected),
            hint: "Recorded payments",
            icon: BookOpenCheck,
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to invoices
                    </Link>
                    <h1 className="mt-4 font-serif text-3xl text-foreground">Invoice Accounting Audit</h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        This checks whether every issued invoice has the required accounting trail:
                        Debit AR, Credit Revenue, Credit PPN, then Debit Bank and Credit AR when paid.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant={exceptionRows.length === 0 ? "success" : "warning"}>
                        {exceptionRows.length === 0 ? "No exceptions" : `${exceptionRows.length} exceptions`}
                    </Badge>
                    <Badge variant={summary.unbalancedJournals === 0 ? "success" : "danger"}>
                        {summary.unbalancedJournals} unbalanced journals
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[16px] border border-border bg-card p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-surface text-foreground">
                                <metric.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
                <div className="rounded-[16px] border border-border bg-card">
                    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-serif text-xl text-foreground">Posting Exceptions</h2>
                            <p className="text-sm text-muted-foreground">Invoices that need accounting review before reporting.</p>
                        </div>
                        <Badge variant={exceptionRows.length === 0 ? "success" : "warning"}>
                            {exceptionRows.length} flagged
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface">
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Invoice</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Ledger</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Accounting issue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {exceptionRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
                                            All issued invoices have the expected accounting trail.
                                        </td>
                                    </tr>
                                ) : (
                                    exceptionRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-surface/60">
                                            <td className="px-4 py-4">
                                                <p className="font-mono text-xs font-medium text-foreground">{row.nomorInvoice}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.issueDate)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">{row.ledgerCompany}</td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="font-medium text-foreground">{formatIDR(row.total)}</p>
                                                <p className="text-xs text-muted-foreground">{formatIDR(row.outstanding)} open</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    {row.issues.map((issue) => (
                                                        <div key={issue} className="inline-flex items-center gap-1 rounded-[6px] bg-error-muted px-2 py-1 text-xs font-medium text-error">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {issue}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[16px] border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground">Audit Totals</h2>
                        <div className="mt-5 space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Total invoices</span>
                                <span className="font-medium text-foreground">{summary.totalInvoices}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Should be posted</span>
                                <span className="font-medium text-foreground">{summary.invoicesNeedingPosting}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Missing posting</span>
                                <span className="font-medium text-error">{summary.missingPosting}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Clients missing COA</span>
                                <span className="font-medium text-foreground">{summary.clientsWithMissingAccounts}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground">Required COA</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Each ledger company needs these accounts before invoices can post reliably.
                        </p>
                        <div className="mt-5 space-y-3">
                            {clients.filter((client) => client.missingAccounts.length > 0).length === 0 ? (
                                <div className="flex items-center gap-2 rounded-[12px] border border-border bg-surface p-4 text-sm text-success">
                                    <CheckCircle2 className="h-4 w-4" />
                                    All ledger companies have required invoice accounts.
                                </div>
                            ) : (
                                clients
                                    .filter((client) => client.missingAccounts.length > 0)
                                    .map((client) => (
                                        <div key={client.id} className="rounded-[12px] border border-border bg-surface p-4">
                                            <div className="flex items-center gap-2">
                                                <FileWarning className="h-4 w-4 text-warning" />
                                                <p className="text-sm font-medium text-foreground">{client.name}</p>
                                            </div>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Missing: {client.missingAccounts.join(", ")}
                                            </p>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground">Accounting Rule</h2>
                        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <p>Issued invoice: Dr 120 Piutang Usaha, Cr 604 Pendapatan Jasa, Cr 320 Utang PPN.</p>
                            <p>Payment received: Dr 110 Bank, Cr 120 Piutang Usaha.</p>
                            <p>Draft invoices are commercial documents only and should not hit the ledger yet.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-[16px] border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h2 className="font-serif text-xl text-foreground">Invoice Ledger Register</h2>
                    <p className="text-sm text-muted-foreground">Full invoice-to-ledger trace for audit sampling.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Invoice</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Status</th>
                                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Total</th>
                                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Paid</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Journal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-surface/60">
                                    <td className="px-4 py-4">
                                        <p className="font-mono text-xs font-medium text-foreground">{row.nomorInvoice}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{row.ledgerCompany}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={row.issues.length > 0 ? "warning" : "success"}>{row.status}</Badge>
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium text-foreground">{formatIDR(row.total)}</td>
                                    <td className="px-4 py-4 text-right text-muted-foreground">{formatIDR(row.paid)}</td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm text-foreground">{row.sentJournalRef ?? "No posting journal"}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {row.paymentJournalCount} payment journals, {row.reversalJournalCount} reversals
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
