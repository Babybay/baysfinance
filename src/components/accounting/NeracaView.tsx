"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, Scale, CheckCircle2, AlertTriangle } from "lucide-react";
import { Client } from "@/lib/data";
import {
    getNeraca,
    type NeracaData,
    type NeracaGroup,
    type NeracaAccount,
} from "@/app/actions/accounting/neraca";

interface NeracaViewProps {
    clients: Client[];
}

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

function AccountRow({ account }: { account: NeracaAccount }) {
    return (
        <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-2 text-sm pl-12">
                <span className="text-muted-foreground font-mono text-xs mr-2">{account.code}</span>
                {account.name}
            </td>
            <td className="px-4 py-2 text-sm text-right font-medium tabular-nums">
                {formatRp(account.balance)}
            </td>
        </tr>
    );
}

function GroupBlock({
    group,
    showSubtotal = true,
}: {
    group: NeracaGroup;
    showSubtotal?: boolean;
}) {
    if (group.accounts.length === 0) return null;
    return (
        <>
            <tr className="bg-[#EFF6FF]">
                <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 pl-6" colSpan={2}>
                    {group.label}
                </td>
            </tr>
            {group.accounts.map((acct) => (
                <AccountRow key={acct.code} account={acct} />
            ))}
            {showSubtotal && (
                <tr className="border-t border-border bg-muted/10">
                    <td className="px-4 py-2 text-sm font-bold pl-6">
                        Total {group.label}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold tabular-nums">
                        {formatRp(group.total)}
                    </td>
                </tr>
            )}
        </>
    );
}

function SideTable({
    title,
    groups,
    grandTotal,
    grandTotalLabel,
}: {
    title: string;
    groups: { group: NeracaGroup; showSubtotal?: boolean }[];
    grandTotal: number;
    grandTotalLabel: string;
}) {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-blue-900 text-white px-4 py-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left">
                                Keterangan
                            </th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-44">
                                Jumlah (Rp)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(({ group, showSubtotal }) => (
                            <GroupBlock
                                key={group.label}
                                group={group}
                                showSubtotal={showSubtotal ?? true}
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-double border-border bg-blue-50/60">
                            <td className="px-4 py-3 text-sm font-bold uppercase">
                                {grandTotalLabel}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold tabular-nums">
                                {formatRp(grandTotal)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function NeracaView({ clients }: NeracaViewProps) {
    const now = new Date();
    const [selectedClient, setSelectedClient] = useState("");
    const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
    const [data, setData] = useState<NeracaData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!selectedClient || !endDate) return;
        setLoading(true);
        setError(null);
        const res = await getNeraca(selectedClient, new Date(endDate));
        if (res.success && res.data) {
            setData(res.data);
        } else {
            setError(res.error || "Gagal memuat data");
            setData(null);
        }
        setLoading(false);
    }, [selectedClient, endDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const hasData =
        data &&
        (data.asetLancar.accounts.length > 0 ||
            data.asetTidakLancar.accounts.length > 0 ||
            data.kewajibanJangkaPendek.accounts.length > 0 ||
            data.kewajibanJangkaPanjang.accounts.length > 0 ||
            data.ekuitas.accounts.length > 0);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            Per Tanggal
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
                            disabled={!selectedClient}
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
                    <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Pilih klien untuk melihat neraca.</p>
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
                    <p className="text-muted-foreground font-medium">Memuat neraca...</p>
                </div>
            ) : !hasData ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Tidak ada data untuk tanggal ini.</p>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {/* Header + balance badge */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-serif">{data.clientName}</h2>
                            <p className="text-sm text-muted-foreground">
                                NERACA — Per {formatDate(data.endDate)}
                            </p>
                        </div>
                        {data.isBalanced ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-lg text-sm text-success font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Balanced
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                Tidak Balance ({formatRp(data.totalAset - data.totalKewajibanDanEkuitas)})
                            </div>
                        )}
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* LEFT: ASET */}
                        <SideTable
                            title="ASET"
                            groups={[
                                { group: data.asetLancar },
                                { group: data.asetTidakLancar },
                            ]}
                            grandTotal={data.totalAset}
                            grandTotalLabel="TOTAL ASET"
                        />

                        {/* RIGHT: KEWAJIBAN & EKUITAS */}
                        <SideTable
                            title="KEWAJIBAN & EKUITAS"
                            groups={[
                                { group: data.kewajibanJangkaPendek },
                                { group: data.kewajibanJangkaPanjang },
                                { group: data.ekuitas },
                            ]}
                            grandTotal={data.totalKewajibanDanEkuitas}
                            grandTotalLabel="TOTAL KEWAJIBAN & EKUITAS"
                        />
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Aset
                            </p>
                            <p className="text-xl font-bold font-serif">{formatRp(data.totalAset)}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Kewajiban
                            </p>
                            <p className="text-xl font-bold font-serif">{formatRp(data.totalKewajiban)}</p>
                        </div>
                        <div className={`border rounded-xl p-4 shadow-sm ${data.isBalanced ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Ekuitas
                            </p>
                            <p className="text-xl font-bold font-serif">{formatRp(data.totalEkuitas)}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
