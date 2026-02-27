"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    Users, CalendarDays, Receipt, BarChart3,
    ArrowRight, AlertTriangle, Clock,
    CheckCircle2, Plus, FileText,
} from "lucide-react";
import {
    formatIDR,
    Client, Invoice, TaxDeadline,
} from "@/lib/data";

interface AdminDashboardProps {
    clients: Client[];
    invoices: Invoice[];
    deadlines: TaxDeadline[];
}

export function AdminDashboard({ clients, invoices, deadlines }: AdminDashboardProps) {
    const { t } = useI18n();

    const klienAktif = clients.filter((c) => c.status === "Aktif").length;
    const pendapatan = invoices.filter((i) => i.status === "Lunas").reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").reduce((s, i) => s + i.total, 0);
    const overdueCount = deadlines.filter((d) => d.status === "Terlambat").length;
    const pendingCount = deadlines.filter((d) => d.status === "Belum Lapor").length;
    const totalUrgent = overdueCount + pendingCount;

    const deadlineSoon = deadlines
        .filter((d) => d.status === "Belum Lapor" || d.status === "Terlambat")
        .sort((a, b) => {
            // Overdue first, then by date
            if (a.status === "Terlambat" && b.status !== "Terlambat") return -1;
            if (a.status !== "Terlambat" && b.status === "Terlambat") return 1;
            return new Date(a.tanggalBatas).getTime() - new Date(b.tanggalBatas).getTime();
        })
        .slice(0, 5);

    const invoicesBelum = invoices
        .filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo")
        .sort((a, b) => {
            // Overdue first
            if (a.status === "Jatuh Tempo" && b.status !== "Jatuh Tempo") return -1;
            if (a.status !== "Jatuh Tempo" && b.status === "Jatuh Tempo") return 1;
            return new Date(a.jatuhTempo).getTime() - new Date(b.jatuhTempo).getTime();
        })
        .slice(0, 5);

    const isHealthy = overdueCount === 0;

    return (
        <div>
            {/* ── Zone A: Greeting ──────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t.dashboard.titleAdmin}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
            </div>

            {/* ── Zone B: KPI Strip ────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                    <p className="text-xs text-accent mt-1">{t.dashboard.invoicePaid}</p>
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
            </div>

            {/* ── Zone C: Two-column Feed ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            deadlineSoon.map((d) => (
                                <div key={d.id} className={`flex items-center justify-between p-3 rounded-[8px] transition-colors ${d.status === "Terlambat" ? "bg-error-muted border border-error/10" : "bg-surface hover:bg-border/50"}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {d.status === "Terlambat" ? (
                                            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-accent shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{d.jenisPajak} — {d.clientName}</p>
                                            <p className="text-xs text-muted-foreground">{d.masaPajak}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-muted shrink-0 ml-2">
                                        {new Date(d.tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                    </span>
                                </div>
                            ))
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
                                        <Badge variant={inv.status === "Jatuh Tempo" ? "danger" : "info"} className="mt-1">{inv.status}</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
