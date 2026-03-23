"use client";

import React, { useState, useCallback } from "react";
import { FileSpreadsheet, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Client } from "@/lib/data";
import { getImportHistory, rollbackImportBatch } from "@/app/actions/import-accounting";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-detector";
import type { DocumentType } from "@/lib/document-detector";

interface HistoryEntry {
    id: string;
    fileName: string;
    documentType: string;
    entriesCount: number;
    skippedCount: number;
    errorsCount: number;
    importedBy: string;
    createdAt: Date;
}

interface Props {
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
    initialHistory: HistoryEntry[];
    initialTotal: number;
}

export function ImportHistoryView({
    clients,
    defaultClientId,
    isClientRole,
    initialHistory,
    initialTotal,
}: Props) {
    const { t, locale } = useI18n();
    const ti = t?.accounting?.import;

    const [clientId, setClientId] = useState(defaultClientId);
    const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
    const [total, setTotal] = useState(initialTotal);
    const [loading, setLoading] = useState(false);
    const [rollingBack, setRollingBack] = useState<string | null>(null);

    const loadHistory = useCallback(async (cId: string) => {
        if (!cId) return;
        setLoading(true);
        try {
            const res = await getImportHistory(cId);
            setHistory(res.data);
            setTotal(res.total);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleClientChange = useCallback((newClientId: string) => {
        setClientId(newClientId);
        loadHistory(newClientId);
    }, [loadHistory]);

    const handleRollback = useCallback(async (batchId: string) => {
        if (!clientId) return;
        if (!window.confirm(ti?.rollbackConfirm ?? "Yakin ingin membatalkan import ini? Semua jurnal dari batch ini akan dihapus.")) {
            return;
        }

        setRollingBack(batchId);
        try {
            const res = await rollbackImportBatch(batchId, clientId);
            if (res.success) {
                // Reload history
                await loadHistory(clientId);
            } else {
                alert(res.error || "Gagal membatalkan import.");
            }
        } finally {
            setRollingBack(null);
        }
    }, [clientId, loadHistory, ti]);

    const getTypeLabel = (type: string) => {
        const labels = DOCUMENT_TYPE_LABELS[type as DocumentType];
        return labels ? (labels[locale as "en" | "id"] || labels.id) : type;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/accounting/import"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {ti?.backToImport ?? "Kembali ke Import"}
                </Link>
            </div>

            <h2 className="text-lg font-semibold text-foreground">
                {ti?.history ?? "Riwayat Import"}
            </h2>

            {/* Client selector */}
            {!isClientRole && (
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-foreground">
                        {ti?.selectClient ?? "Pilih Klien"}
                    </label>
                    <select
                        value={clientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                        <option value="">{ti?.chooseClient ?? "— Pilih klien —"}</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.nama}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            )}

            {!loading && history.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto h-12 w-12" />
                    <p className="mt-4">{ti?.noHistory ?? "Belum ada riwayat import."}</p>
                </div>
            )}

            {!loading && history.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">{ti?.date ?? "Tanggal"}</th>
                                <th className="px-4 py-2 text-left font-medium">{ti?.fileName ?? "File"}</th>
                                <th className="px-4 py-2 text-left font-medium">{ti?.docType ?? "Tipe"}</th>
                                <th className="px-4 py-2 text-right font-medium">{ti?.imported ?? "Diimpor"}</th>
                                <th className="px-4 py-2 text-right font-medium">{ti?.skipped ?? "Dilewati"}</th>
                                <th className="px-4 py-2 text-left font-medium">{ti?.importedByLabel ?? "Oleh"}</th>
                                <th className="px-4 py-2 text-center font-medium">{ti?.actions ?? "Aksi"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {history.map((batch) => (
                                <tr key={batch.id}>
                                    <td className="px-4 py-2 font-mono text-xs">
                                        {new Date(batch.createdAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                                            year: "numeric", month: "short", day: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </td>
                                    <td className="px-4 py-2 max-w-[200px] truncate">{batch.fileName}</td>
                                    <td className="px-4 py-2">
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                            {getTypeLabel(batch.documentType)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-success">{batch.entriesCount}</td>
                                    <td className="px-4 py-2 text-right text-warning">{batch.skippedCount}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{batch.importedBy}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => handleRollback(batch.id)}
                                            disabled={rollingBack === batch.id}
                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-error hover:bg-error-muted disabled:opacity-50"
                                            title={ti?.rollback ?? "Batalkan Import"}
                                        >
                                            {rollingBack === batch.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3" />
                                            )}
                                            {ti?.rollback ?? "Rollback"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 20 && (
                <p className="text-center text-xs text-muted-foreground">
                    {ti?.showingOf ?? "Menampilkan"} {history.length} / {total}
                </p>
            )}
        </div>
    );
}
