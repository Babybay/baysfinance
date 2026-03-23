"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    CalendarDays, Receipt,
    ArrowRight, AlertTriangle, Clock,
    CheckCircle2, Shield, Mail,
    TrendingUp, FileText, Scan,
} from "lucide-react";
import {
    formatIDR,
    Client, Invoice, TaxDeadline,
} from "@/lib/data";
import { InvoiceStatus, TaxDeadlineStatus } from "@prisma/client";

interface ClientDashboardProps {
    client: Client | null;
    invoices: Invoice[];
    deadlines: TaxDeadline[];
}

export function ClientDashboard({ client, invoices, deadlines }: ClientDashboardProps) {
    const { t, locale } = useI18n();

    // ── No client linked ──────────────────────────────────────
    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mb-6">
                    <Shield className="h-8 w-8 text-muted" />
                </div>
                <h2 className="font-serif text-xl tracking-tight text-foreground mb-2">{t.dashboard.clientNoData}</h2>
                <p className="text-sm text-muted-foreground max-w-[360px] text-center mb-6">{t.dashboard.clientNoDataDesc}</p>
                <Link href="/contact">
                    <Button variant="accent" size="default" className="gap-2">
                        <Mail className="h-4 w-4" />
                        {t.dashboard.contactAdvisor}
                    </Button>
                </Link>
            </div>
        );
    }

    // ── Computed data ─────────────────────────────────────────
    const outstanding = invoices.filter((i) => i.status === InvoiceStatus.Terkirim || i.status === InvoiceStatus.JatuhTempo).reduce((s, i) => s + i.total, 0);
    const overdueCount = deadlines.filter((d) => d.status === TaxDeadlineStatus.Terlambat).length;
    const isHealthy = overdueCount === 0;

    // Payment history
    const paidInvoices = invoices.filter((i) => i.status === InvoiceStatus.Lunas);
    const totalPaid = paidInvoices.reduce((s, i) => s + i.total, 0);

    // Compliance stats
    const totalDeadlines = deadlines.length;
    const completedDeadlines = deadlines.filter((d) => d.status === TaxDeadlineStatus.SudahLapor).length;
    const complianceRate = totalDeadlines > 0 ? Math.round((completedDeadlines / totalDeadlines) * 100) : 100;

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

    const nextDeadline = deadlineSoon.length > 0
        ? deadlineSoon[0]
        : null;

    const nextDeadlineDate = nextDeadline
        ? new Date(nextDeadline.tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "long" })
        : null;

    const daysUntilDeadline = nextDeadline
        ? Math.ceil((new Date(nextDeadline.tanggalBatas).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div>
            {/* ── Greeting ──────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t.dashboard.greeting}, {client.nama}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitleClient}</p>
            </div>

            {/* ── KPI Strip ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Outstanding Balance */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.clientOutstanding}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-accent-muted flex items-center justify-center"><Receipt className="h-4 w-4 text-accent" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(outstanding)}</p>
                    <p className="text-xs text-accent mt-1">{t.dashboard.clientUnpaid}</p>
                </div>

                {/* Next Deadline with countdown */}
                <div className={`rounded-[16px] border p-5 transition-shadow hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] ${overdueCount > 0 ? "bg-error-muted border-error/20" : "bg-card border-border"
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.clientNextDeadline}</span>
                        <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center ${overdueCount > 0 ? "bg-error/10" : "bg-surface"
                            }`}>
                            {overdueCount > 0 ? (
                                <AlertTriangle className="h-4 w-4 text-error" />
                            ) : (
                                <CalendarDays className="h-4 w-4 text-foreground" />
                            )}
                        </div>
                    </div>
                    <p className={`text-xl font-semibold ${overdueCount > 0 ? "text-error" : "text-foreground"}`}>
                        {nextDeadlineDate || t.dashboard.clientNoDeadline}
                    </p>
                    <p className={`text-xs mt-1 ${overdueCount > 0 ? "text-error" : "text-muted-foreground"}`}>
                        {daysUntilDeadline !== null ? (
                            daysUntilDeadline < 0
                                ? `${Math.abs(daysUntilDeadline)} ${locale === "id" ? "hari terlambat" : "days overdue"}`
                                : daysUntilDeadline === 0
                                    ? (locale === "id" ? "Hari ini!" : "Today!")
                                    : `${daysUntilDeadline} ${locale === "id" ? "hari lagi" : "days left"}`
                        ) : (
                            `${deadlineSoon.length} ${t.dashboard.upcomingLabel.toLowerCase()}`
                        )}
                    </p>
                </div>

                {/* Compliance Status with progress bar */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.clientCompliance}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-surface flex items-center justify-center">
                            {isHealthy ? (
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 text-error" />
                            )}
                        </div>
                    </div>
                    <p className={`text-xl font-semibold ${complianceRate >= 80 ? "text-success" : complianceRate >= 50 ? "text-warning" : "text-error"}`}>
                        {complianceRate}%
                    </p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${complianceRate >= 80 ? "bg-success" : complianceRate >= 50 ? "bg-warning" : "bg-error"}`}
                            style={{ width: `${complianceRate}%` }}
                        />
                    </div>
                </div>

                {/* Total Paid */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">
                            {locale === "id" ? "Total Dibayar" : "Total Paid"}
                        </span>
                        <div className="h-8 w-8 rounded-[8px] bg-success-bg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-success" />
                        </div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(totalPaid)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {paidInvoices.length} {locale === "id" ? "invoice lunas" : "invoices paid"}
                    </p>
                </div>
            </div>

            {/* ── Quick Actions for Client ─────────────────────────── */}
            <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/dashboard/documents">
                    <Button variant="soft" size="default" className="gap-2">
                        <FileText className="h-4 w-4" />
                        {locale === "id" ? "Dokumen Saya" : "My Documents"}
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
            </div>

            {/* ── Two-column Feed ──────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deadlines with countdown */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">{t.dashboard.clientDeadlines}</h2>
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
                                                <p className="text-sm font-medium text-foreground truncate">{d.jenisPajak}</p>
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

                {/* Invoices */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">{t.dashboard.clientInvoices}</h2>
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
                            invoicesBelum.map((inv) => {
                                const dueDays = Math.ceil((new Date(inv.jatuhTempo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface hover:bg-border/50 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground">{inv.nomorInvoice}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(inv.tanggal).toLocaleDateString("id-ID")}
                                                {dueDays <= 0 && (
                                                    <span className="ml-1 text-error font-medium">
                                                        ({Math.abs(dueDays)}d {locale === "id" ? "terlambat" : "overdue"})
                                                    </span>
                                                )}
                                                {dueDays > 0 && dueDays <= 7 && (
                                                    <span className="ml-1 text-warning font-medium">
                                                        ({dueDays}d {locale === "id" ? "lagi" : "left"})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-sm font-semibold text-foreground">{formatIDR(inv.total)}</p>
                                            <Badge variant={inv.status === InvoiceStatus.JatuhTempo ? "danger" : "info"} className="mt-1">{inv.status === InvoiceStatus.JatuhTempo ? "Jatuh Tempo" : inv.status}</Badge>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
