"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    CalendarDays, Receipt,
    ArrowRight, AlertTriangle, Clock,
    Briefcase, Building2, Plane, Wine,
    Calculator, Landmark, Scale, FileCheck,
    Globe, ClipboardCheck, GemIcon, TrendingUp,
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

    const outstanding = invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").reduce((s, i) => s + i.total, 0);
    const deadlineSoon = deadlines
        .filter((d) => d.status === "Belum Lapor" || d.status === "Terlambat")
        .sort((a, b) => new Date(a.tanggalBatas).getTime() - new Date(b.tanggalBatas).getTime())
        .slice(0, 5);
    const invoicesBelum = invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").slice(0, 5);

    const serviceItems = [
        { icon: Briefcase, label: t.services.perijinanUsaha },
        { icon: Building2, label: t.services.perijinanBangunan },
        { icon: Plane, label: t.services.kitasKitap },
        { icon: Wine, label: t.services.perijinanMikol },
        { icon: Calculator, label: t.services.akuntansi },
        { icon: Landmark, label: t.services.perpajakan },
        { icon: Scale, label: t.services.pendirianPerusahaan },
        { icon: FileCheck, label: t.services.legalitas },
        { icon: Globe, label: t.services.izinTinggal },
        { icon: ClipboardCheck, label: t.services.audit },
        { icon: GemIcon, label: t.services.appraisal },
        { icon: TrendingUp, label: t.services.financialAdvisory },
    ];

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <AlertTriangle className="h-12 w-12 text-muted mb-4" />
                <h2 className="font-serif text-xl tracking-tight text-foreground">Data Klien Tidak Ditemukan</h2>
                <p className="text-muted-foreground mt-2">Akun Anda belum dikaitkan dengan profil klien.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="font-serif text-2xl text-foreground">{t.dashboard.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Selamat datang, {client.nama}! Berikut ringkasan akun Anda.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Total Tagihan</span>
                        <div className="h-8 w-8 rounded-[8px] bg-accent-muted flex items-center justify-center"><Receipt className="h-4 w-4 text-accent" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{formatIDR(outstanding)}</p>
                    <p className="text-xs text-accent mt-1">Belum dibayar</p>
                </div>
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Deadline Berikutnya</span>
                        <div className="h-8 w-8 rounded-[8px] bg-error-muted flex items-center justify-center"><CalendarDays className="h-4 w-4 text-error" /></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                        {deadlineSoon.length > 0
                            ? new Date(deadlineSoon[0].tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "long" })
                            : "Tidak ada"}
                    </p>
                    <p className="text-xs text-error mt-1">{deadlineSoon.length} deadline mendatang</p>
                </div>
                <div className="bg-card rounded-[16px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_24px_0px] transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Status Kepatuhan</span>
                        <div className="h-8 w-8 rounded-[8px] bg-surface flex items-center justify-center"><Badge variant="success" className="h-5"><Clock className="h-3 w-3 mr-1" /> Stabil</Badge></div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">Lancar</p>
                    <p className="text-xs text-muted-foreground mt-1">Semua kewajiban terpenuhi</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Upcoming Deadlines */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">Deadline Pajak Anda</h2>
                        <Link href="/dashboard/tax-calendar">
                            <Button variant="transparent" size="default">Selengkapnya <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {deadlineSoon.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada deadline aktif! 🎉</p>
                        ) : (
                            deadlineSoon.map((d) => (
                                <div key={d.id} className={`flex items-center justify-between p-3 rounded-[8px] ${d.status === "Terlambat" ? "bg-error-muted border border-error/10" : "bg-surface"}`}>
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

                {/* Outstanding Invoices */}
                <div className="bg-card rounded-[16px] border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-normal text-foreground text-lg">Invoice Menunggu Pembayaran</h2>
                        <Link href="/dashboard/invoices">
                            <Button variant="transparent" size="default">Selengkapnya <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {invoicesBelum.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Semua tagihan sudah lunas! ✅</p>
                        ) : (
                            invoicesBelum.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface">
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

            {/* Services Section */}
            <div className="bg-card rounded-[16px] border border-border p-6">
                <div className="mb-6">
                    <h2 className="font-serif font-normal text-foreground text-lg">{t.services.heading}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t.services.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {serviceItems.map((service, idx) => (
                        <div
                            key={idx}
                            className="group flex flex-col items-center gap-3 p-4 rounded-[12px] bg-surface hover:bg-accent-muted border border-transparent hover:border-accent/20 transition-all duration-200 cursor-default"
                        >
                            <div className="h-10 w-10 rounded-[10px] bg-card border border-border group-hover:bg-accent-muted group-hover:border-accent/20 flex items-center justify-center transition-colors duration-200">
                                <service.icon className="h-5 w-5 text-muted group-hover:text-accent transition-colors duration-200" />
                            </div>
                            <span className="text-xs font-medium text-foreground text-center leading-tight">{service.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
