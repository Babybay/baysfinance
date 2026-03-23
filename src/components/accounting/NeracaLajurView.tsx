"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, TableProperties, CheckCircle2, AlertTriangle } from "lucide-react";
import { Client } from "@/lib/data";
import {
    getNeracaLajur,
    type NeracaLajurData,
    type NLSection,
    type NLSubsection,
} from "@/app/actions/accounting/neraca-lajur";

interface NeracaLajurViewProps {
    clients: Client[];
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatRp(amount: number): string {
    if (amount === 0) return " - ";
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(abs);
    if (amount < 0) return `(Rp ${formatted})`;
    return `Rp ${formatted}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubsectionRows({ sub }: { sub: NLSubsection }) {
    if (sub.accounts.length === 0) return null;
    return (
        <>
            {/* Sub-header */}
            <tr className="bg-info-bg">
                <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-info pl-8">
                    {sub.label}
                </td>
                <td className="px-4 py-2 text-xs font-bold text-info" />
                <td className="px-4 py-2 text-xs font-bold text-right text-info" />
            </tr>

            {/* Account rows */}
            {sub.accounts.map((acct) => (
                <tr key={acct.code} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-sm pl-16">{acct.name}</td>
                    <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{acct.code}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium tabular-nums">
                        {formatRp(acct.balance)}
                    </td>
                </tr>
            ))}

            {/* Subsection total */}
            <tr className="border-t border-border bg-muted/10">
                <td className="px-4 py-2 text-sm font-bold pl-8">
                    Jumlah {sub.label}
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-sm text-right font-bold tabular-nums border-t border-border">
                    {formatRp(sub.total)}
                </td>
            </tr>
        </>
    );
}

function SectionBlock({ section }: { section: NLSection }) {
    const hasData = section.subsections.some((s) => s.accounts.length > 0);
    if (!hasData) return null;

    return (
        <>
            {/* Section header */}
            <tr className="bg-table-header-bg text-table-header-text">
                <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider" colSpan={3}>
                    {section.label}
                </td>
            </tr>

            {section.subsections.map((sub) => (
                <SubsectionRows key={sub.label} sub={sub} />
            ))}

            {/* Section total */}
            <tr className="border-t-2 border-double border-border bg-table-alt-bg">
                <td className="px-4 py-3 text-sm font-bold uppercase">
                    JUMLAH {section.label}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-sm text-right font-bold tabular-nums border-t-2 border-double border-border">
                    {formatRp(section.total)}
                </td>
            </tr>

            {/* Spacer */}
            <tr className="h-2">
                <td colSpan={3} />
            </tr>
        </>
    );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function NeracaLajurView({ clients }: NeracaLajurViewProps) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [selectedClient, setSelectedClient] = useState("");
    const [startDate, setStartDate] = useState(startOfYear.toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
    const [data, setData] = useState<NeracaLajurData | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!selectedClient || !startDate || !endDate) return;
        setLoading(true);
        setError(null);
        const res = await getNeracaLajur(
            selectedClient,
            new Date(startDate),
            new Date(endDate)
        );
        if (res.success && res.data) {
            setData(res.data);
        } else {
            setError(res.error || "Gagal memuat data");
            setData(null);
        }
        setLoading(false);
    }, [selectedClient, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownloadExcel = async () => {
        if (!selectedClient || !startDate || !endDate) return;
        setDownloading(true);
        try {
            const params = new URLSearchParams({ clientId: selectedClient, startDate, endDate });
            const response = await fetch(`/api/accounting/neraca-lajur/excel?${params}`);
            if (!response.ok) throw new Error("Download failed");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const clientName = clients.find((c) => c.id === selectedClient)?.nama || "Client";
            a.download = `NeracaLajur_${clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${endDate}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            console.error("Excel download failed");
        } finally {
            setDownloading(false);
        }
    };

    const hasData =
        data &&
        (data.aset.subsections.some((s) => s.accounts.length > 0) ||
            data.kewajiban.subsections.some((s) => s.accounts.length > 0) ||
            data.labaRugi.subsections.some((s) => s.accounts.length > 0));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Klien
                        </label>
                        <Select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            options={clients.map((c) => ({ value: c.id, label: c.nama }))}
                            placeholder="Pilih Klien..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Dari Tanggal
                        </label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Sampai Tanggal
                        </label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="dark"
                            className="gap-2 w-full"
                            onClick={handleDownloadExcel}
                            disabled={!selectedClient || downloading}
                            isLoading={downloading}
                        >
                            <Download className="h-4 w-4" />
                            Excel
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {!selectedClient ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <TableProperties className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Pilih klien untuk melihat neraca lajur.
                    </p>
                </div>
            ) : error ? (
                <div className="p-20 text-center bg-destructive/5 border border-destructive/20 rounded-xl">
                    <p className="text-destructive font-medium">{error}</p>
                    <button onClick={fetchData} className="mt-4 text-sm text-accent hover:underline">
                        Coba lagi
                    </button>
                </div>
            ) : loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Memuat neraca lajur...</p>
                </div>
            ) : !hasData ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <TableProperties className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Tidak ada data untuk periode ini.
                    </p>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {/* Report header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-serif">{data.clientName}</h2>
                            <p className="text-sm text-muted-foreground">
                                NERACA LAJUR — s/d {formatDate(data.endDate)}
                            </p>
                        </div>
                        {/* Balance check badge */}
                        {data.isBalanced ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-lg text-sm text-success font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Balanced
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                Tidak Balance ({formatRp(data.totalAset - data.totalKewajibanDanModal)})
                            </div>
                        )}
                    </div>

                    {/* Main table */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left">
                                            Keterangan
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left w-28">
                                            Kode Akun
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-44">
                                            Jumlah (Rp)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <SectionBlock section={data.aset} />
                                    <SectionBlock section={data.kewajiban} />

                                    {/* LABA RUGI section */}
                                    <tr className="bg-table-header-bg text-table-header-text">
                                        <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider" colSpan={3}>
                                            LABA RUGI
                                        </td>
                                    </tr>

                                    {/* Pendapatan */}
                                    {data.labaRugi.subsections[0] &&
                                        data.labaRugi.subsections[0].accounts.length > 0 && (
                                            <>
                                                <tr className="bg-info-bg">
                                                    <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-info pl-8">
                                                        PENDAPATAN
                                                    </td>
                                                    <td colSpan={2} />
                                                </tr>
                                                {data.labaRugi.subsections[0].accounts.map((acct) => (
                                                    <tr key={acct.code} className="border-b border-border hover:bg-muted/20 transition-colors">
                                                        <td className="px-4 py-2 text-sm pl-16">{acct.name}</td>
                                                        <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{acct.code}</td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium tabular-nums">
                                                            {formatRp(acct.balance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-border bg-muted/10">
                                                    <td className="px-4 py-2 text-sm font-bold pl-8">Jumlah Pendapatan</td>
                                                    <td />
                                                    <td className="px-4 py-2 text-sm text-right font-bold tabular-nums border-t border-border">
                                                        {formatRp(data.totalPendapatan)}
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                    {/* Beban */}
                                    {data.labaRugi.subsections[1] &&
                                        data.labaRugi.subsections[1].accounts.length > 0 && (
                                            <>
                                                <tr className="bg-info-bg">
                                                    <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-info pl-8">
                                                        BEBAN
                                                    </td>
                                                    <td colSpan={2} />
                                                </tr>
                                                {data.labaRugi.subsections[1].accounts.map((acct) => (
                                                    <tr key={acct.code} className="border-b border-border hover:bg-muted/20 transition-colors">
                                                        <td className="px-4 py-2 text-sm pl-16">{acct.name}</td>
                                                        <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{acct.code}</td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium tabular-nums">
                                                            {formatRp(acct.balance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-border bg-muted/10">
                                                    <td className="px-4 py-2 text-sm font-bold pl-8">Jumlah Beban</td>
                                                    <td />
                                                    <td className="px-4 py-2 text-sm text-right font-bold tabular-nums border-t border-border">
                                                        {formatRp(data.totalBeban)}
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                    {/* Laba Rugi calculations */}
                                    <tr className="border-t-2 border-double border-border bg-warning-bg">
                                        <td className="px-4 py-3 text-sm font-bold">LABA RUGI SEBELUM PAJAK</td>
                                        <td />
                                        <td className="px-4 py-3 text-sm text-right font-bold tabular-nums border-t-2 border-double border-border">
                                            {formatRp(data.labaRugiSebelumPajak)}
                                        </td>
                                    </tr>
                                    <tr className="bg-warning-muted">
                                        <td className="px-4 py-3 text-sm font-bold">LABA RUGI SETELAH PAJAK</td>
                                        <td />
                                        <td className="px-4 py-3 text-sm text-right font-bold tabular-nums">
                                            {formatRp(data.labaRugiSetelahPajak)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Aset
                            </p>
                            <p className="text-xl font-bold font-serif">{formatRp(data.totalAset)}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Kewajiban & Modal
                            </p>
                            <p className="text-xl font-bold font-serif">{formatRp(data.totalKewajibanDanModal)}</p>
                        </div>
                        <div className={`border rounded-xl p-4 shadow-sm ${data.isBalanced ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Laba Bersih (Setelah Pajak)
                            </p>
                            <p className={`text-xl font-bold font-serif ${data.labaRugiSetelahPajak < 0 ? "text-destructive" : "text-success"}`}>
                                {formatRp(data.labaRugiSetelahPajak)}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
