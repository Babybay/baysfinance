"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatIDR, sampleInvoices, sampleClients, sampleDeadlines, Invoice, Client, TaxDeadline } from "@/lib/data";
import { TrendingUp, TrendingDown, Users, Receipt, CalendarDays, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ReportsPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);

    useEffect(() => {
        const storedInv = localStorage.getItem("pajak_invoices");
        const storedClients = localStorage.getItem("pajak_clients");
        const storedDeadlines = localStorage.getItem("pajak_deadlines");
        setInvoices(storedInv ? JSON.parse(storedInv) : sampleInvoices);
        setClients(storedClients ? JSON.parse(storedClients) : sampleClients);
        setDeadlines(storedDeadlines ? JSON.parse(storedDeadlines) : sampleDeadlines);
    }, []);

    const totalPendapatan = invoices.filter((i) => i.status === "Lunas").reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").reduce((s, i) => s + i.total, 0);
    const klienAktif = clients.filter((c) => c.status === "Aktif").length;
    const deadlineTerlambat = deadlines.filter((d) => d.status === "Terlambat").length;
    const deadlineSudah = deadlines.filter((d) => d.status === "Sudah Lapor").length;
    const kepatuhanPersen = deadlines.length > 0 ? Math.round((deadlineSudah / deadlines.length) * 100) : 0;

    // Monthly revenue breakdown
    const monthlyRevenue: Record<string, number> = {};
    invoices.filter((i) => i.status === "Lunas").forEach((inv) => {
        const month = new Date(inv.tanggal).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inv.total;
    });

    // Per-client revenue
    const clientRevenue: { name: string; total: number }[] = [];
    const clientMap: Record<string, number> = {};
    invoices.filter((i) => i.status === "Lunas").forEach((inv) => {
        clientMap[inv.clientName] = (clientMap[inv.clientName] || 0) + inv.total;
    });
    Object.entries(clientMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, total]) => clientRevenue.push({ name, total }));

    // Invoice status distribution
    const statusDist = {
        Draft: invoices.filter((i) => i.status === "Draft").length,
        Terkirim: invoices.filter((i) => i.status === "Terkirim").length,
        Lunas: invoices.filter((i) => i.status === "Lunas").length,
        "Jatuh Tempo": invoices.filter((i) => i.status === "Jatuh Tempo").length,
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
                <p className="text-sm text-muted-foreground mt-1">Ringkasan performa bisnis konsultasi pajak</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-card rounded-[12px] border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Total Pendapatan</span>
                        <div className="h-8 w-8 rounded-[8px] bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatIDR(totalPendapatan)}</p>
                    <p className="text-xs text-emerald-500 mt-1">Invoice lunas</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
                        <div className="h-8 w-8 rounded-[8px] bg-amber-500/10 flex items-center justify-center">
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatIDR(outstanding)}</p>
                    <p className="text-xs text-amber-500 mt-1">Belum dibayar</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Klien Aktif</span>
                        <div className="h-8 w-8 rounded-[8px] bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-foreground">{klienAktif}</p>
                    <p className="text-xs text-muted-foreground mt-1">dari {clients.length} total klien</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Kepatuhan Pajak</span>
                        <div className="h-8 w-8 rounded-[8px] bg-indigo-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-foreground">{kepatuhanPersen}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{deadlineSudah}/{deadlines.length} deadline</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Revenue */}
                <div className="bg-card rounded-[12px] border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Pendapatan per Bulan</h3>
                    {Object.keys(monthlyRevenue).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pendapatan</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(monthlyRevenue).map(([month, total]) => {
                                const maxVal = Math.max(...Object.values(monthlyRevenue));
                                const pct = (total / maxVal) * 100;
                                return (
                                    <div key={month} className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground w-24 shrink-0">{month}</span>
                                        <div className="flex-1 bg-surface rounded-full h-6 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                                                style={{ width: `${Math.max(pct, 10)}%` }}
                                            >
                                                <span className="text-xs text-white font-medium">{formatIDR(total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Client Revenue */}
                <div className="bg-card rounded-[12px] border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Pendapatan per Klien</h3>
                    {clientRevenue.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                    ) : (
                        <div className="space-y-3">
                            {clientRevenue.map((cr, i) => (
                                <div key={cr.name} className="flex items-center justify-between p-3 rounded-[8px] bg-surface">
                                    <div className="flex items-center gap-3">
                                        <span className="h-7 w-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span className="text-sm font-medium text-foreground">{cr.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{formatIDR(cr.total)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Invoice Status Distribution */}
                <div className="bg-card rounded-[12px] border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Distribusi Status Invoice</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(statusDist).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between p-3 bg-surface rounded-[8px]">
                                <Badge variant={status === "Lunas" ? "success" : status === "Jatuh Tempo" ? "danger" : status === "Terkirim" ? "info" : "default"}>
                                    {status}
                                </Badge>
                                <span className="text-lg font-bold text-foreground">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tax Compliance */}
                <div className="bg-card rounded-[12px] border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Status Kepatuhan Pajak</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-[8px]">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-medium text-emerald-500">Sudah Lapor</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-500">{deadlineSudah}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-[8px]">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-amber-500">Belum Lapor</span>
                            </div>
                            <span className="text-lg font-bold text-amber-500">{deadlines.filter((d) => d.status === "Belum Lapor").length}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-error-muted rounded-[8px]">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-error" />
                                <span className="text-sm font-medium text-error">Terlambat</span>
                            </div>
                            <span className="text-lg font-bold text-error">{deadlineTerlambat}</span>
                        </div>
                    </div>
                    {/* Compliance bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Tingkat Kepatuhan</span>
                            <span>{kepatuhanPersen}%</span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${kepatuhanPersen >= 80 ? "bg-emerald-500" : kepatuhanPersen >= 50 ? "bg-amber-500" : "bg-error"}`}
                                style={{ width: `${kepatuhanPersen}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
