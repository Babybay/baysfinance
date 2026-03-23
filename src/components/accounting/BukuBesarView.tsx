"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Client } from "@/lib/data";
import {
    getBukuBesar,
    type BukuBesarData,
    type BukuBesarAccount,
} from "@/app/actions/accounting/buku-besar";

interface BukuBesarViewProps {
    clients: Client[];
    accounts: { id: string; code: string; name: string }[];
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
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function AccountLedger({
    account,
    startDate,
    endDate,
}: {
    account: BukuBesarAccount;
    startDate: string;
    endDate: string;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-info-bg hover:bg-info-muted transition-colors"
            >
                <div className="flex items-center gap-2">
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-bold text-sm">
                        {account.accountCode} — {account.accountName}
                    </span>
                </div>
                <span className="text-sm font-semibold">
                    Saldo: {formatRp(account.closingBalance)}
                </span>
            </button>

            {expanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[110px]">
                                    Tanggal
                                </th>
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[140px]">
                                    Ref
                                </th>
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Keterangan
                                </th>
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-[140px]">
                                    Debit
                                </th>
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-[140px]">
                                    Kredit
                                </th>
                                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-[150px]">
                                    Saldo
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {/* Opening balance */}
                            <tr className="bg-muted/20">
                                <td className="p-3 text-sm font-bold">
                                    {formatDate(startDate)}
                                </td>
                                <td className="p-3 text-sm" />
                                <td className="p-3 text-sm font-bold">Saldo Awal</td>
                                <td className="p-3 text-sm text-right" />
                                <td className="p-3 text-sm text-right" />
                                <td className="p-3 text-sm text-right font-bold">
                                    {formatRp(account.openingBalance)}
                                </td>
                            </tr>

                            {/* Transactions */}
                            {account.transactions.map((tx, i) => (
                                <tr
                                    key={i}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <td className="p-3 text-sm">{formatDate(tx.date)}</td>
                                    <td className="p-3 text-sm font-mono text-accent">
                                        {tx.refNumber}
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {tx.description}
                                    </td>
                                    <td className="p-3 text-sm text-right font-medium">
                                        {tx.debit > 0 ? formatRp(tx.debit) : " - "}
                                    </td>
                                    <td className="p-3 text-sm text-right font-medium">
                                        {tx.credit > 0 ? formatRp(tx.credit) : " - "}
                                    </td>
                                    <td className="p-3 text-sm text-right font-semibold">
                                        {formatRp(tx.runningBalance)}
                                    </td>
                                </tr>
                            ))}

                            {account.transactions.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-muted-foreground text-sm"
                                    >
                                        Tidak ada transaksi pada periode ini.
                                    </td>
                                </tr>
                            )}

                            {/* Totals row */}
                            <tr className="border-t-2 border-border bg-muted/10">
                                <td className="p-3 text-sm" />
                                <td className="p-3 text-sm" />
                                <td className="p-3 text-sm font-bold">Total</td>
                                <td className="p-3 text-sm text-right font-bold">
                                    {formatRp(account.totalDebit)}
                                </td>
                                <td className="p-3 text-sm text-right font-bold">
                                    {formatRp(account.totalCredit)}
                                </td>
                                <td className="p-3 text-sm text-right" />
                            </tr>

                            {/* Closing balance */}
                            <tr className="bg-muted/20 border-t-2 border-double border-border">
                                <td className="p-3 text-sm font-bold">
                                    {formatDate(endDate)}
                                </td>
                                <td className="p-3 text-sm" />
                                <td className="p-3 text-sm font-bold">Saldo Akhir</td>
                                <td className="p-3 text-sm text-right" />
                                <td className="p-3 text-sm text-right" />
                                <td className="p-3 text-sm text-right font-bold text-accent">
                                    {formatRp(account.closingBalance)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export function BukuBesarView({ clients, accounts }: BukuBesarViewProps) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [selectedClient, setSelectedClient] = useState("");
    const [selectedAccount, setSelectedAccount] = useState("");
    const [startDate, setStartDate] = useState(
        startOfYear.toISOString().split("T")[0]
    );
    const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
    const [data, setData] = useState<BukuBesarData | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!selectedClient || !startDate || !endDate) return;
        setLoading(true);
        setError(null);
        const res = await getBukuBesar(
            selectedClient,
            new Date(startDate),
            new Date(endDate),
            selectedAccount || undefined
        );
        if (res.success && res.data) {
            setData(res.data);
        } else {
            setError(res.error || "Gagal memuat data");
            setData(null);
        }
        setLoading(false);
    }, [selectedClient, selectedAccount, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownloadExcel = async () => {
        if (!selectedClient || !startDate || !endDate) return;
        setDownloading(true);
        try {
            const params = new URLSearchParams({
                clientId: selectedClient,
                startDate,
                endDate,
            });
            if (selectedAccount) params.set("accountCode", selectedAccount);

            const response = await fetch(
                `/api/accounting/buku-besar/excel?${params.toString()}`
            );
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const clientName =
                clients.find((c) => c.id === selectedClient)?.nama || "Client";
            a.download = `BukuBesar_${clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${startDate}_${endDate}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            console.error("Excel download failed");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Klien
                        </label>
                        <Select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            options={clients.map((c) => ({
                                value: c.id,
                                label: c.nama,
                            }))}
                            placeholder="Pilih Klien..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Akun (Opsional)
                        </label>
                        <Select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            options={[
                                { value: "", label: "Semua Akun" },
                                ...accounts.map((a) => ({
                                    value: a.code,
                                    label: `${a.code} - ${a.name}`,
                                })),
                            ]}
                            placeholder="Semua Akun"
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
                    <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Pilih klien untuk melihat buku besar.
                    </p>
                </div>
            ) : error ? (
                <div className="p-20 text-center bg-error/5 border border-error/20 rounded-xl">
                    <p className="text-error font-medium">{error}</p>
                    <button
                        onClick={fetchData}
                        className="mt-4 text-sm text-accent hover:underline"
                    >
                        Coba lagi
                    </button>
                </div>
            ) : loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                        Memuat data buku besar...
                    </p>
                </div>
            ) : data && data.accounts.length === 0 ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Tidak ada data buku besar untuk periode ini.
                    </p>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-serif">{data.clientName}</h2>
                            <p className="text-sm text-muted-foreground">
                                Periode: {formatDate(data.startDate)} s/d{" "}
                                {formatDate(data.endDate)} &middot;{" "}
                                {data.accounts.length} akun
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {data.accounts.map((account) => (
                            <AccountLedger
                                key={account.accountId}
                                account={account}
                                startDate={data.startDate}
                                endDate={data.endDate}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
