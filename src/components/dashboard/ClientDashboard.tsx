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
} from "lucide-react";
import {
    formatIDR,
    Client, Invoice, TaxDeadline,
} from "@/lib/data";

interface ClientDashboardProps {
    client: Client | null;
    invoices: Invoice[];
    deadlines: TaxDeadline[];
}

export function ClientDashboard({ client, invoices, deadlines }: ClientDashboardProps) {
    const { t } = useI18n();

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
    const outstanding = invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").reduce((s, i) => s + i.total, 0);
    const overdueCount = deadlines.filter((d) => d.status === "Terlambat").length;
    const isHealthy = overdueCount === 0;

    const deadlineSoon = deadlines
        .filter((d) => d.status === "Belum Lapor" || d.status === "Terlambat")
        .sort((a, b) => {
            if (a.status === "Terlambat" && b.status !== "Terlambat") return -1;
            if (a.status !== "Terlambat" && b.status === "Terlambat") return 1;
            return new Date(a.tanggalBatas).getTime() - new Date(b.tanggalBatas).getTime();
        })
        .slice(0, 5);

    const invoicesBelum = invoices
        .filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo")
        .sort((a, b) => {
            if (a.status === "Jatuh Tempo" && b.status !== "Jatuh Tempo") return -1;
            if (a.status !== "Jatuh Tempo" && b.status === "Jatuh Tempo") return 1;
            return new Date(a.jatuhTempo).getTime() - new Date(b.jatuhTempo).getTime();
        })
        .slice(0, 5);

    const nextDeadline = deadlineSoon.length > 0
        ? new Date(deadlineSoon[0].tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "long" })
        : null;

    return (
        <div>
            {/* ── Greeting ──────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t.dashboard.greeting}, {client.nama}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitleClient}</p>
            </div>

            {/* ── KPI Strip ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Outstanding Balance */}
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.clientOutstanding}</span>
                        <div className="h-8 w-8 rounded-[8px] bg-accent-muted flex items-center justify-center"><Receipt className="h-4 w-4 text-accent" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(outstanding)}</p>
                    <p className="text-xs text-accent mt-1">{t.dashboard.clientUnpaid}</p>
                </div>

                {/* Next Deadline */}
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
                        {nextDeadline || t.dashboard.clientNoDeadline}
                    </p>
                    <p className={`text-xs mt-1 ${overdueCount > 0 ? "text-error" : "text-muted-foreground"}`}>
                        {overdueCount > 0
                            ? t.dashboard.overdue.replace("{count}", String(overdueCount))
                            : `${deadlineSoon.length} ${t.dashboard.upcomingLabel.toLowerCase()}`
                        }
                    </p>
                </div>

                {/* Compliance Status */}
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
                    <p className={`text-xl font-semibold ${isHealthy ? "text-accent" : "text-error"}`}>
                        {isHealthy ? t.dashboard.clientComplianceGood : t.dashboard.overdue.replace("{count}", String(overdueCount))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {isHealthy ? t.dashboard.clientComplianceAll : t.dashboard.subtitle}
                    </p>
                </div>
            </div>

            {/* ── Two-column Feed ──────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deadlines */}
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
                            deadlineSoon.map((d) => (
                                <div key={d.id} className={`flex items-center justify-between p-3 rounded-[8px] transition-colors ${d.status === "Terlambat" ? "bg-error-muted border border-error/10" : "bg-surface hover:bg-border/50"}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {d.status === "Terlambat" ? (
                                            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-accent shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{d.jenisPajak}</p>
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
                            invoicesBelum.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface hover:bg-border/50 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{inv.nomorInvoice}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(inv.tanggal).toLocaleDateString("id-ID")}</p>
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
