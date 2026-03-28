"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatIDR } from "@/lib/data";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";
import {
    getInvoiceAging,
    type AgingData,
    type AgingBucket,
    type AgingInvoice,
} from "@/app/actions/accounting/aging";
import { ChevronDown, ChevronRight, Clock, AlertTriangle } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function bucketColor(index: number): {
    text: string;
    bg: string;
    border: string;
} {
    switch (index) {
        case 0:
            return {
                text: "text-success",
                bg: "bg-success-bg",
                border: "border-success/30",
            };
        case 1:
            return {
                text: "text-info",
                bg: "bg-info-bg",
                border: "border-info/30",
            };
        case 2:
            return {
                text: "text-warning",
                bg: "bg-warning-bg",
                border: "border-warning/30",
            };
        case 3:
            return {
                text: "text-error",
                bg: "bg-error-muted",
                border: "border-error/30",
            };
        case 4:
            return {
                text: "text-error",
                bg: "bg-error-muted",
                border: "border-error/30",
            };
        default:
            return {
                text: "text-muted-foreground",
                bg: "bg-muted/20",
                border: "border-border",
            };
    }
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: AgingInvoice }) {
    return (
        <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-2 text-sm font-mono">
                {invoice.nomorInvoice}
            </td>
            <td className="px-4 py-2 text-sm">{invoice.clientName}</td>
            <td className="px-4 py-2 text-sm text-right tabular-nums">
                {formatIDR(invoice.total)}
            </td>
            <td className="px-4 py-2 text-sm text-right tabular-nums">
                {formatIDR(invoice.totalPaid)}
            </td>
            <td className="px-4 py-2 text-sm text-right tabular-nums font-medium">
                {formatIDR(invoice.remaining)}
            </td>
            <td className="px-4 py-2 text-sm text-center">
                {formatDate(invoice.jatuhTempo)}
            </td>
            <td className="px-4 py-2 text-sm text-center">
                {invoice.daysOverdue > 0 ? (
                    <span className="text-error font-medium">
                        {invoice.daysOverdue}d
                    </span>
                ) : (
                    <span className="text-success font-medium">
                        {Math.abs(invoice.daysOverdue)}d left
                    </span>
                )}
            </td>
        </tr>
    );
}

// ── Bucket Section ───────────────────────────────────────────────────────────

function BucketSection({
    bucket,
    index,
}: {
    bucket: AgingBucket;
    index: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const colors = bucketColor(index);

    if (bucket.invoiceCount === 0) return null;

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                        className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
                    >
                        {bucket.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {bucket.invoiceCount} invoice{bucket.invoiceCount !== 1 ? "s" : ""}
                    </span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${colors.text}`}>
                    {formatIDR(bucket.totalAmount)}
                </span>
            </button>

            {expanded && (
                <div className="border-t border-border overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left">
                                    No. Invoice
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left">
                                    Klien
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                                    Total
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                                    Dibayar
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                                    Sisa
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                                    Jatuh Tempo
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                                    Overdue
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {bucket.invoices.map((inv) => (
                                <InvoiceRow
                                    key={inv.nomorInvoice}
                                    invoice={inv}
                                />
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-border bg-muted/10">
                                <td
                                    colSpan={4}
                                    className="px-4 py-2 text-sm font-bold"
                                >
                                    Total {bucket.label}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-bold tabular-nums">
                                    {formatIDR(bucket.totalAmount)}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Main View ────────────────────────────────────────────────────────────────

export function AgingReportView() {
    const { selectedClientId: selectedClient } = useSelectedClient();
    const [data, setData] = useState<AgingData | null>(null);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await getInvoiceAging(
            selectedClient || undefined
        );
        if (res.success && res.data) {
            setData(res.data);
        } else {
            toast.error(res.error || "Gagal memuat data aging");
            setData(null);
        }
        setLoading(false);
    }, [selectedClient]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-serif">
                        Invoice Aging Report
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Analisis umur piutang berdasarkan jatuh tempo invoice
                    </p>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                        Memuat data aging...
                    </p>
                </div>
            ) : !data || data.totalInvoices === 0 ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Tidak ada invoice outstanding.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {data.buckets.map((bucket, i) => {
                            const colors = bucketColor(i);
                            return (
                                <Card
                                    key={bucket.label}
                                    className={`${colors.border} border`}
                                >
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <CardTitle
                                            className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}
                                        >
                                            {bucket.label}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 pt-0">
                                        <p className="text-lg font-bold font-serif tabular-nums">
                                            {formatIDR(bucket.totalAmount)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {bucket.invoiceCount} invoice{bucket.invoiceCount !== 1 ? "s" : ""}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Grand Total */}
                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            <div>
                                <p className="text-sm font-bold">
                                    Total Outstanding
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {data.totalInvoices} invoice{data.totalInvoices !== 1 ? "s" : ""} belum lunas
                                </p>
                            </div>
                        </div>
                        <p className="text-xl font-bold font-serif tabular-nums">
                            {formatIDR(data.grandTotal)}
                        </p>
                    </div>

                    {/* Bucket Details */}
                    <div className="space-y-3">
                        {data.buckets.map((bucket, i) => (
                            <BucketSection
                                key={bucket.label}
                                bucket={bucket}
                                index={i}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
