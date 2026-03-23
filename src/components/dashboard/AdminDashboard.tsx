"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    Users, CalendarDays, Receipt, BarChart3,
    ArrowRight, AlertTriangle, Clock,
    CheckCircle2, Plus, FileText, FileCheck,
    TrendingUp, TrendingDown, FolderOpen,
    Scan, Upload, Activity,
} from "lucide-react";
import {
    formatIDR,
    Client, Invoice, TaxDeadline,
} from "@/lib/data";
import { ClientStatus, InvoiceStatus, TaxDeadlineStatus } from "@prisma/client";
import type { PermitSummary, MonthlyRevenue, RecentActivity } from "@/app/actions/dashboard-data";

interface AdminDashboardProps {
    clients: Client[];
    invoices: Invoice[];
    deadlines: TaxDeadline[];
    permitSummary?: PermitSummary;
    monthlyRevenue?: MonthlyRevenue[];
    recentActivity?: RecentActivity[];
    documentCount?: number;
    importBatchCount?: number;
}

const PERMIT_STATUS_COLORS: Record<string, string> = {
    Draft: "bg-surface text-muted-foreground",
    WaitingDocument: "bg-warning-bg text-warning border border-warning-border",
    Processing: "bg-info-bg text-info border border-info-border",
    Issued: "bg-success-bg text-success border border-success-border",
    Completed: "bg-success-bg text-success border border-success-border",
    Cancelled: "bg-error-muted text-error",
    OnHold: "bg-warning-bg text-warning border border-warning-border",
    Verification: "bg-purple-bg text-purple border border-purple-border",
    RevisionRequired: "bg-warning-bg text-warning border border-warning-border",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    invoice: <Receipt className="h-4 w-4 text-accent" />,
    deadline: <CalendarDays className="h-4 w-4 text-warning" />,
    permit: <FileCheck className="h-4 w-4 text-info" />,
    document: <FolderOpen className="h-4 w-4 text-purple" />,
    import: <Upload className="h-4 w-4 text-success" />,
};

export function AdminDashboard({
    clients,
    invoices,
    deadlines,
    permitSummary,
    monthlyRevenue = [],
    recentActivity = [],
    documentCount = 0,
    importBatchCount = 0,
}: AdminDashboardProps) {
    const { t, locale } = useI18n();

    const klienAktif = clients.filter((c) => c.status === ClientStatus.Aktif).length;
    const pendapatan = invoices.filter((i) => i.status === InvoiceStatus.Lunas).reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter((i) => i.status === InvoiceStatus.Terkirim || i.status === InvoiceStatus.JatuhTempo).reduce((s, i) => s + i.total, 0);
    const overdueCount = deadlines.filter((d) => d.status === TaxDeadlineStatus.Terlambat).length;
    const pendingCount = deadlines.filter((d) => d.status === TaxDeadlineStatus.BelumLapor).length;

    const deadlineSoon = deadlines
        .filter((d) => d.status === TaxDeadlineStatus.BelumLapor || d.status === TaxDeadlineStatus.Terlambat)
        .sort((a, b) => {
            if (a.status === TaxDeadlineStatus.Terlambat && b.status !== TaxDeadlineStatus.Terlambat) return -1;
            if (a.status !== TaxDeadlineStatus.Terlambat && b.status === TaxDeadlineStatus.Terlambat) return 1;
            return new Date(a.tanggalBatas).getTime() - new Date(b.tanggalBatas).getTime();
        })
        .slice(0, 5);

    const invoicesBelum = invoices
        .filter((i) => i.status === InvoiceStatus.Terkirim || i.status === InvoiceStatus.JatuhTempo)
        .sort((a, b) => {
            if (a.status === InvoiceStatus.JatuhTempo && b.status !== InvoiceStatus.JatuhTempo) return -1;
            if (a.status !== InvoiceStatus.JatuhTempo && b.status === InvoiceStatus.JatuhTempo) return 1;
            return new Date(a.jatuhTempo).getTime() - new Date(b.jatuhTempo).getTime();
        })
        .slice(0, 5);

    const isHealthy = overdueCount === 0;

    // Monthly revenue comparison
    const currentMonthRev = monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1] : null;
    const prevMonthRev = monthlyRevenue.length > 1 ? monthlyRevenue[monthlyRevenue.length - 2] : null;
    const revenueTrend = currentMonthRev && prevMonthRev && prevMonthRev.revenue > 0
        ? ((currentMonthRev.revenue - prevMonthRev.revenue) / prevMonthRev.revenue) * 100
        : 0;

    // Deadline countdown (days until next deadline)
    const nextDeadline = deadlineSoon.length > 0 ? deadlineSoon[0] : null;
    const daysUntilDeadline = nextDeadline
        ? Math.ceil((new Date(nextDeadline.tanggalBatas).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Max revenue for bar chart scaling
    const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

    return (
        <div>
            {/* ── Zone A: Greeting ──────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t.dashboard.titleAdmin}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
            </div>

            {/* ── Zone B: KPI Strip ────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* North Star: Overdue Deadlines */}
                <div className={`rounded-[16px] border p-5 transition-shadow hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] ${isHealthy
                    ? "bg-card border-border"
                    : "bg-error-muted border-error/20"
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.upcomingDeadlines}</span>
                        <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center ${isHealthy ? "bg-surface" : "bg-error/10"
                            }`}>
                            {isHealthy ? (
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 text-error" />
                            )}
                        </div>
                    </div>
                    <p className={`text-xl font-semibold ${isHealthy ? "text-accent" : "text-error"}`}>
                        {isHealthy ? t.dashboard.noOverdue : overdueCount}
                    </p>
                    <p className={`text-xs mt-1 ${isHealthy ? "text-accent" : "text-error"}`}>
                        {isHealthy
                            ? `${pendingCount} ${t.dashboard.upcomingLabel.toLowerCase()}`
                            : t.dashboard.overdue.replace("{count}", String(overdueCount))
                        }
                    </p>
                </div>

                {/* Revenue */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.revenue}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-accent-muted flex items-center justify-center"><BarChart3 className="h-4 w-4 text-accent" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(pendapatan)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        {revenueTrend !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${revenueTrend > 0 ? "text-success" : "text-error"}`}>
                                {revenueTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {revenueTrend > 0 ? "+" : ""}{revenueTrend.toFixed(0)}%
                            </span>
                        )}
                        <span className="text-xs text-accent">{t.dashboard.invoicePaid}</span>
                    </div>
                </div>

                {/* Active Clients */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.activeClients}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-surface flex items-center justify-center"><Users className="h-4 w-4 text-foreground" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{klienAktif}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.dashboard.fromClients.replace("{count}", String(clients.length))}</p>
                </div>

                {/* Outstanding */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.outstanding}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-accent-muted flex items-center justify-center"><Receipt className="h-4 w-4 text-accent" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(outstanding)}</p>
                    <p className="text-xs text-accent mt-1">{t.dashboard.unpaid}</p>
                </div>
            </div>

            {/* ── Zone B2: Secondary KPIs ─────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Deadline Countdown */}
                <div className="bg-card rounded-[16px] border border-border p-4 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {locale === "id" ? "Deadline Terdekat" : "Next Deadline"}
                        </span>
                    </div>
                    {daysUntilDeadline !== null ? (
                        <>
                            <p className={`text-2xl font-bold ${
                                daysUntilDeadline < 0 ? "text-error" : daysUntilDeadline <= 3 ? "text-warning" : "text-foreground"
                            }`}>
                                {daysUntilDeadline < 0
                                    ? `${Math.abs(daysUntilDeadline)}d ${locale === "id" ? "terlambat" : "overdue"}`
                                    : daysUntilDeadline === 0
                                        ? (locale === "id" ? "Hari ini!" : "Today!")
                                        : `${daysUntilDeadline}d`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {nextDeadline?.jenisPajak}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {locale === "id" ? "Tidak ada deadline" : "No deadlines"}
                        </p>
                    )}
                </div>

                {/* Permits */}
                <div className="bg-card rounded-[16px] border border-border p-4 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {locale === "id" ? "Perijinan Aktif" : "Active Permits"}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{permitSummary?.total || 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {permitSummary?.byStatus?.Processing || 0} {locale === "id" ? "sedang diproses" : "processing"}
                    </p>
                </div>

                {/* Documents */}
                <div className="bg-card rounded-[16px] border border-border p-4 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {locale === "id" ? "Total Dokumen" : "Total Documents"}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{documentCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {importBatchCount} {locale === "id" ? "batch import" : "import batches"}
                    </p>
                </div>

                {/* Tax Compliance Rate */}
                <div className="bg-card rounded-[16px] border border-border p-4 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {locale === "id" ? "Kepatuhan Pajak" : "Tax Compliance"}
                        </span>
                    </div>
                    {(() => {
                        const total = deadlines.length;
                        const compliant = deadlines.filter((d) => d.status === TaxDeadlineStatus.SudahLapor).length;
                        const rate = total > 0 ? Math.round((compliant / total) * 100) : 100;
                        return (
                            <>
                                <p className={`text-2xl font-bold ${rate >= 80 ? "text-success" : rate >= 50 ? "text-warning" : "text-error"}`}>
                                    {rate}%
                                </p>
                                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warning" : "bg-error"}`}
                                        style={{ width: `${rate}%` }}
                                    />
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* ── Quick Actions ─────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/dashboard/clients">
                    <Button variant="soft" size="default" className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t.dashboard.addClient}
                    </Button>
                </Link>
                <Link href="/dashboard/invoices">
                    <Button variant="soft" size="default" className="gap-2">
                        <FileText className="h-4 w-4" />
                        {t.dashboard.createInvoice}
                    </Button>
                </Link>
                <Link href="/dashboard/tax-calendar">
                    <Button variant="soft" size="default" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t.sidebar.taxCalendar}
                    </Button>
                </Link>
                <Link href="/dashboard/accounting/scan">
                    <Button variant="soft" size="default" className="gap-2">
                        <Scan className="h-4 w-4" />
                        {locale === "id" ? "Scan Dokumen" : "Scan Document"}
                    </Button>
                </Link>
                <Link href="/dashboard/accounting/import">
                    <Button variant="soft" size="default" className="gap-2">
                        <Upload className="h-4 w-4" />
                        {locale === "id" ? "Import Data" : "Import Data"}
                    </Button>
                </Link>
            </div>

            {/* ── Zone C: Main Content Grid ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Urgency Feed: Deadlines */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">{t.dashboard.nearestDeadlines}</h2>
                        <Link href="/dashboard/tax-calendar">
                            <Button variant="transparent" size="default">{t.dashboard.viewAll} <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {deadlineSoon.length === 0 ? (
                            <div className="flex items-center gap-3 py-6 justify-center">
                                <CheckCircle2 className="h-5 w-5 text-accent" />
                                <p className="text-sm text-muted-foreground">{t.dashboard.allDeadlinesMet}</p>
                            </div>
                        ) : (
                            deadlineSoon.map((d) => {
                                const daysLeft = Math.ceil((new Date(d.tanggalBatas).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={d.id} className={`flex items-center justify-between p-3 rounded-[8px] transition-colors ${d.status === TaxDeadlineStatus.Terlambat ? "bg-error-muted border border-error/10" : "bg-surface hover:bg-border/50"}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            {d.status === TaxDeadlineStatus.Terlambat ? (
                                                <AlertTriangle className="h-4 w-4 text-error shrink-0" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-accent shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{d.jenisPajak} — {d.clientName}</p>
                                                <p className="text-xs text-muted-foreground">{d.masaPajak}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <span className="text-xs font-medium text-muted">
                                                {new Date(d.tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            </span>
                                            <p className={`text-xs font-bold ${daysLeft < 0 ? "text-error" : daysLeft <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                                                {daysLeft < 0
                                                    ? `${Math.abs(daysLeft)}d ${locale === "id" ? "lalu" : "ago"}`
                                                    : daysLeft === 0
                                                        ? (locale === "id" ? "Hari ini" : "Today")
                                                        : `${daysLeft}d ${locale === "id" ? "lagi" : "left"}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Action Feed: Invoices */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">{t.dashboard.unpaidInvoices}</h2>
                        <Link href="/dashboard/invoices">
                            <Button variant="transparent" size="default">{t.dashboard.viewAll} <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {invoicesBelum.length === 0 ? (
                            <div className="flex items-center gap-3 py-6 justify-center">
                                <CheckCircle2 className="h-5 w-5 text-accent" />
                                <p className="text-sm text-muted-foreground">{t.dashboard.allInvoicesPaid}</p>
                            </div>
                        ) : (
                            invoicesBelum.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface hover:bg-border/50 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{inv.nomorInvoice}</p>
                                        <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-sm font-semibold text-foreground">{formatIDR(inv.total)}</p>
                                        <Badge variant={inv.status === InvoiceStatus.JatuhTempo ? "danger" : "info"} className="mt-1">{inv.status === InvoiceStatus.JatuhTempo ? "Jatuh Tempo" : inv.status}</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Zone D: Bottom Widgets ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Revenue Chart */}
                {monthlyRevenue.length > 0 && (
                    <div className="bg-card rounded-[16px] border border-border p-6">
                        <h2 className="font-serif font-normal text-foreground text-lg mb-4">
                            {locale === "id" ? "Pendapatan Bulanan" : "Monthly Revenue"}
                        </h2>
                        <div className="space-y-2.5">
                            {monthlyRevenue.slice(-6).map((m) => {
                                const pct = (m.revenue / maxRevenue) * 100;
                                const [year, month] = m.month.split("-");
                                const monthName = new Date(parseInt(year), parseInt(month) - 1)
                                    .toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short" });
                                return (
                                    <div key={m.month}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">{monthName} {year}</span>
                                            <span className="font-medium text-foreground">{formatIDR(m.revenue)}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-accent transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Permit Status Breakdown */}
                {permitSummary && permitSummary.total > 0 && (
                    <div className="bg-card rounded-[16px] border border-border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-serif font-normal text-foreground text-lg">
                                {locale === "id" ? "Status Perijinan" : "Permit Status"}
                            </h2>
                            <Link href="/dashboard/permits">
                                <Button variant="transparent" size="default">{t.dashboard.viewAll} <ArrowRight className="h-3 w-3 ml-1" /></Button>
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(permitSummary.byStatus)
                                .sort(([, a], [, b]) => b - a)
                                .map(([status, count]) => (
                                    <div key={status} className="flex items-center justify-between p-2.5 rounded-[8px] bg-surface">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PERMIT_STATUS_COLORS[status] || "bg-surface text-muted-foreground"}`}>
                                            {t.permits?.status?.[status.charAt(0).toLowerCase() + status.slice(1) as keyof typeof t.permits.status] || status}
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">{count}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Recent Activity Feed */}
                {recentActivity.length > 0 && (
                    <div className="bg-card rounded-[16px] border border-border p-6">
                        <h2 className="font-serif font-normal text-foreground text-lg mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                {locale === "id" ? "Aktivitas Terkini" : "Recent Activity"}
                            </div>
                        </h2>
                        <div className="space-y-3">
                            {recentActivity.slice(0, 8).map((act) => (
                                <div key={act.id} className="flex items-start gap-3 p-2 rounded-[8px] hover:bg-surface transition-colors">
                                    <div className="mt-0.5 shrink-0">
                                        {ACTIVITY_ICONS[act.type] || <Activity className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-foreground truncate">{act.description}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(act.timestamp).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                                                    day: "numeric",
                                                    month: "short",
                                                })}
                                            </span>
                                            {act.meta && (
                                                <span className="text-xs text-muted-foreground">
                                                    {act.meta}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
