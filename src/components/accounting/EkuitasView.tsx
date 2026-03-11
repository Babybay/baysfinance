"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, TrendingUp } from "lucide-react";
import { Client } from "@/lib/data";
import {
    getEkuitas,
    type EkuitasData,
    type EkuitasRow,
} from "@/app/actions/accounting/ekuitas";

interface EkuitasViewProps {
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

const COLUMNS: { key: keyof EkuitasRow; label: string }[] = [
    { key: "modalDisetor", label: "Modal Disetor" },
    { key: "cadangan", label: "Cadangan" },
    { key: "prive", label: "Prive" },
    { key: "saldoLaba", label: "Saldo Laba" },
    { key: "labaBerjalan", label: "Laba Berjalan" },
    { key: "total", label: "Total" },
];

function MatrixRow({ row }: { row: EkuitasRow }) {
    return (
        <tr
            className={`border-b border-border/50 transition-colors ${
                row.isBold
                    ? "bg-blue-50/60 font-bold border-t-2 border-double border-border"
                    : "hover:bg-muted/20"
            }`}
        >
            <td className={`px-4 py-2 text-sm ${row.isBold ? "font-bold" : ""}`}>
                {row.label}
            </td>
            {COLUMNS.map(({ key }) => (
                <td
                    key={key}
                    className={`px-4 py-2 text-sm text-right tabular-nums ${
                        row.isBold ? "font-bold" : "font-medium"
                    } ${key === "total" ? "bg-muted/10" : ""}`}
                >
                    {formatRp(row[key] as number)}
                </td>
            ))}
        </tr>
    );
}

export function EkuitasView({ clients }: EkuitasViewProps) {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const [selectedClient, setSelectedClient] = useState("");
    const [startDate, setStartDate] = useState(yearStart);
    const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
    const [data, setData] = useState<EkuitasData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!selectedClient || !startDate || !endDate) return;
        setLoading(true);
        setError(null);
        const res = await getEkuitas(
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const hasData = data && data.rows.length > 0;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            Tanggal Mulai
                        </label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Tanggal Akhir
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
                    <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Pilih klien untuk melihat laporan perubahan ekuitas.
                    </p>
                </div>
            ) : error ? (
                <div className="p-20 text-center bg-destructive/5 border border-destructive/20 rounded-xl">
                    <p className="text-destructive font-medium">{error}</p>
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
                        Memuat laporan ekuitas...
                    </p>
                </div>
            ) : !hasData ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Tidak ada data untuk periode ini.
                    </p>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {/* Header */}
                    <div>
                        <h2 className="text-lg font-serif">{data.clientName}</h2>
                        <p className="text-sm text-muted-foreground">
                            LAPORAN PERUBAHAN EKUITAS — {formatDate(data.startDate)} s/d{" "}
                            {formatDate(data.endDate)}
                        </p>
                    </div>

                    {/* Matrix table */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-blue-900 text-white">
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-left w-48">
                                            Keterangan
                                        </th>
                                        {COLUMNS.map(({ key, label }) => (
                                            <th
                                                key={key}
                                                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right w-36 ${
                                                    key === "total"
                                                        ? "bg-blue-950"
                                                        : ""
                                                }`}
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((row) => (
                                        <MatrixRow key={row.label} row={row} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                            const closing = data.rows[data.rows.length - 1];
                            if (!closing) return null;
                            return (
                                <>
                                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                            Modal Disetor
                                        </p>
                                        <p className="text-xl font-bold font-serif">
                                            {formatRp(closing.modalDisetor)}
                                        </p>
                                    </div>
                                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                            Saldo Laba
                                        </p>
                                        <p className="text-xl font-bold font-serif">
                                            {formatRp(closing.saldoLaba)}
                                        </p>
                                    </div>
                                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                            Total Ekuitas
                                        </p>
                                        <p className="text-xl font-bold font-serif">
                                            {formatRp(closing.total)}
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
