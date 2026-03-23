"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X,
    ChevronDown, FolderUp,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatIDR, Client } from "@/lib/data";
import type { IngestionResult } from "@/lib/ingestion/template-ingestion";

interface TemplateUploadViewProps {
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
    mode: "single" | "batch";
}

type Stage = "upload" | "processing" | "result";

export function TemplateUploadView({
    clients,
    defaultClientId,
    isClientRole,
    mode,
}: TemplateUploadViewProps) {
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [clientId, setClientId] = useState(defaultClientId);
    const [stage, setStage] = useState<Stage>("upload");
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState("");

    // Single mode state
    const [singleResult, setSingleResult] = useState<IngestionResult | null>(null);

    // Batch mode state
    const [batchResults, setBatchResults] = useState<(IngestionResult & { fileName: string })[]>([]);
    const [batchStats, setBatchStats] = useState({ total: 0, success: 0, fail: 0 });
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const ti = t?.accounting?.import;

    const resetState = useCallback(() => {
        setStage("upload");
        setError("");
        setSingleResult(null);
        setBatchResults([]);
        setBatchStats({ total: 0, success: 0, fail: 0 });
        setProgress({ current: 0, total: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    // ── Single file upload ─────────────────────────────────────────────
    const handleSingleUpload = useCallback(async (file: File) => {
        setError("");

        if (!clientId) {
            setError(ti?.selectClientFirst ?? "Pilih klien terlebih dahulu.");
            return;
        }

        if (!/\.(xlsx?|xls)$/i.test(file.name)) {
            setError("Hanya file Excel (.xlsx, .xls) yang didukung untuk template.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError(ti?.fileTooLarge ?? "Ukuran file melebihi 10 MB.");
            return;
        }

        setStage("processing");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("clientId", clientId);

        try {
            const res = await fetch("/api/accounting/template-upload", {
                method: "POST",
                body: formData,
            });
            const json: IngestionResult = await res.json();
            setSingleResult(json);
            setStage("result");
        } catch {
            setError("Gagal mengunggah file. Coba lagi.");
            setStage("upload");
        }
    }, [clientId, ti]);

    // ── Batch upload ───────────────────────────────────────────────────
    const handleBatchUpload = useCallback(async (files: FileList) => {
        setError("");
        setStage("processing");
        setProgress({ current: 0, total: files.length });

        const results: (IngestionResult & { fileName: string })[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setProgress({ current: i + 1, total: files.length });

            if (!/\.(xlsx?|xls)$/i.test(file.name)) {
                results.push({
                    fileName: file.name,
                    success: false,
                    companyName: "",
                    period: "",
                    journalsCreated: 0,
                    assetsCreated: 0,
                    snapshotsCreated: 0,
                    skipped: 0,
                    warnings: [],
                    errors: ["Format file tidak didukung."],
                });
                failCount++;
                continue;
            }

            // Try to auto-detect clientId from filename: "ClientName_Period.xlsx"
            let fileClientId = "";
            const baseName = file.name.replace(/\.(xlsx?|xls)$/i, "");
            const namePart = baseName.split("_")[0]?.trim();

            if (namePart) {
                const match = clients.find(
                    (c) =>
                        c.nama.toUpperCase() === namePart.toUpperCase() ||
                        c.nama.toUpperCase().includes(namePart.toUpperCase()) ||
                        namePart.toUpperCase().includes(c.nama.toUpperCase())
                );
                if (match) fileClientId = match.id;
            }

            if (!fileClientId) {
                results.push({
                    fileName: file.name,
                    success: false,
                    companyName: "",
                    period: "",
                    journalsCreated: 0,
                    assetsCreated: 0,
                    snapshotsCreated: 0,
                    skipped: 0,
                    warnings: [],
                    errors: [`Klien tidak ditemukan dari nama file "${file.name}". Format: NamaKlien_Periode.xlsx`],
                });
                failCount++;
                continue;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("clientId", fileClientId);

            try {
                const res = await fetch("/api/accounting/template-upload", {
                    method: "POST",
                    body: formData,
                });
                const json: IngestionResult = await res.json();
                results.push({ ...json, fileName: file.name });
                if (json.success) successCount++;
                else failCount++;
            } catch {
                results.push({
                    fileName: file.name,
                    success: false,
                    companyName: "",
                    period: "",
                    journalsCreated: 0,
                    assetsCreated: 0,
                    snapshotsCreated: 0,
                    skipped: 0,
                    warnings: [],
                    errors: ["Gagal mengunggah file."],
                });
                failCount++;
            }
        }

        setBatchResults(results);
        setBatchStats({ total: files.length, success: successCount, fail: failCount });
        setStage("result");
    }, [clients]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (mode === "single") {
            const f = e.dataTransfer.files[0];
            if (f) handleSingleUpload(f);
        } else {
            if (e.dataTransfer.files.length > 0) handleBatchUpload(e.dataTransfer.files);
        }
    }, [mode, handleSingleUpload, handleBatchUpload]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (mode === "single") {
            const f = e.target.files?.[0];
            if (f) handleSingleUpload(f);
        } else {
            if (e.target.files && e.target.files.length > 0) handleBatchUpload(e.target.files);
        }
    }, [mode, handleSingleUpload, handleBatchUpload]);

    return (
        <div className="space-y-6">
            {/* Client selector — only for single mode */}
            {mode === "single" && !isClientRole && (
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-foreground">
                        {ti?.selectClient ?? "Pilih Klien"}
                    </label>
                    <select
                        value={clientId}
                        onChange={(e) => { setClientId(e.target.value); resetState(); }}
                        className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                        <option value="">{ti?.chooseClient ?? "— Pilih klien —"}</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.nama}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Batch mode info */}
            {mode === "batch" && stage === "upload" && (
                <div className="rounded-lg border border-info-border bg-info-bg p-4">
                    <p className="text-sm text-info">
                        <strong>Batch Upload:</strong> Pilih beberapa file sekaligus. Nama file harus sesuai format{" "}
                        <code className="rounded bg-info-muted px-1">NamaKlien_Periode.xlsx</code>{" "}
                        agar sistem dapat mencocokkan dengan klien yang terdaftar.
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-error/30 bg-error-muted p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                        <p className="text-sm text-error">{error}</p>
                    </div>
                </div>
            )}

            {/* Upload area */}
            {stage === "upload" && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                        isDragOver
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50 hover:bg-muted/50"
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        multiple={mode === "batch"}
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {mode === "single" ? (
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    ) : (
                        <FolderUp className="mx-auto h-12 w-12 text-muted-foreground" />
                    )}
                    <p className="mt-4 text-lg font-medium text-foreground">
                        {mode === "single"
                            ? "Seret & lepas template Excel di sini"
                            : "Seret & lepas beberapa file template"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {mode === "single"
                            ? "atau klik untuk memilih file (.xlsx)"
                            : "atau klik untuk memilih beberapa file (.xlsx)"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Template standar: 10 sheet (Penjualan, Piutang, Aset, Hutang, Laba Rugi, Arus Kas, Mapping)
                    </p>
                </div>
            )}

            {/* Processing */}
            {stage === "processing" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12">
                    <Loader2 className="h-12 w-12 animate-spin text-accent" />
                    <p className="mt-4 text-lg font-medium text-foreground">
                        {mode === "single"
                            ? "Memproses template..."
                            : `Memproses file ${progress.current}/${progress.total}...`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Membaca sheet, membuat jurnal & aset...
                    </p>
                    {mode === "batch" && progress.total > 0 && (
                        <div className="mt-4 w-64">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-accent transition-all"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Result — Single mode */}
            {stage === "result" && mode === "single" && singleResult && (
                <SingleResultView result={singleResult} onReset={resetState} ti={ti} />
            )}

            {/* Result — Batch mode */}
            {stage === "result" && mode === "batch" && (
                <BatchResultView
                    results={batchResults}
                    stats={batchStats}
                    onReset={resetState}
                    ti={ti}
                />
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SingleResultView({
    result,
    onReset,
    ti,
}: {
    result: IngestionResult;
    onReset: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ti: any;
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
                {result.success ? (
                    <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
                ) : (
                    <AlertTriangle className="mx-auto h-16 w-16 text-error" />
                )}
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                    {result.success
                        ? "Template Berhasil Diproses!"
                        : "Gagal Memproses Template"}
                </h2>
                {result.companyName && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {result.companyName} {result.period && `— ${result.period}`}
                    </p>
                )}

                <div className="mt-6 flex justify-center gap-8 text-sm">
                    <StatBox value={result.journalsCreated} label="Jurnal" color="green" />
                    <StatBox value={result.assetsCreated} label="Aset" color="blue" />
                    <StatBox value={result.snapshotsCreated} label="Laporan" color="purple" />
                    <StatBox value={result.skipped} label="Dilewati" color="yellow" />
                </div>

                {result.warnings.length > 0 && (
                    <WarningsPanel warnings={result.warnings} />
                )}

                {result.errors.length > 0 && (
                    <div className="mx-auto mt-4 max-w-lg rounded-lg border border-error/30 bg-error-muted p-3 text-left text-sm text-error">
                        {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-3">
                <button
                    onClick={onReset}
                    className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
                >
                    {ti?.importAnother ?? "Proses File Lain"}
                </button>
                <Link
                    href="/dashboard/accounting/import/history"
                    className="rounded-md border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                    {ti?.viewHistory ?? "Lihat Riwayat"}
                </Link>
            </div>
        </div>
    );
}

function BatchResultView({
    results,
    stats,
    onReset,
    ti,
}: {
    results: (IngestionResult & { fileName: string })[];
    stats: { total: number; success: number; fail: number };
    onReset: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ti: any;
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                    Batch Import Selesai
                </h2>
                <div className="mt-6 flex justify-center gap-8 text-sm">
                    <StatBox value={stats.total} label="Total File" color="blue" />
                    <StatBox value={stats.success} label="Berhasil" color="green" />
                    <StatBox value={stats.fail} label="Gagal" color="red" />
                </div>
            </div>

            {/* Per-file results */}
            <div className="rounded-lg border border-border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">File</th>
                            <th className="px-3 py-2 text-left font-medium">Perusahaan</th>
                            <th className="px-3 py-2 text-left font-medium">Periode</th>
                            <th className="px-3 py-2 text-right font-medium">Jurnal</th>
                            <th className="px-3 py-2 text-right font-medium">Aset</th>
                            <th className="px-3 py-2 text-center font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {results.map((r, i) => (
                            <tr key={i} className={r.success ? "" : "bg-error-muted"}>
                                <td className="px-3 py-2 max-w-[200px] truncate font-mono text-xs">{r.fileName}</td>
                                <td className="px-3 py-2">{r.companyName || "—"}</td>
                                <td className="px-3 py-2">{r.period || "—"}</td>
                                <td className="px-3 py-2 text-right">{r.journalsCreated}</td>
                                <td className="px-3 py-2 text-right">{r.assetsCreated}</td>
                                <td className="px-3 py-2 text-center">
                                    {r.success ? (
                                        <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                                    ) : (
                                        <span className="text-xs text-error">{r.errors[0]?.slice(0, 40)}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Expandable warnings per file */}
            {results.some((r) => r.warnings.length > 0) && (
                <details className="rounded-lg border border-border bg-card">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                        Peringatan ({results.reduce((s, r) => s + r.warnings.length, 0)})
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </summary>
                    <div className="border-t border-border px-4 py-3 text-sm">
                        {results.filter((r) => r.warnings.length > 0).map((r, i) => (
                            <div key={i} className="mb-2">
                                <p className="font-medium text-foreground">{r.fileName}:</p>
                                {r.warnings.map((w, j) => (
                                    <p key={j} className="ml-4 text-muted-foreground">{w}</p>
                                ))}
                            </div>
                        ))}
                    </div>
                </details>
            )}

            <div className="flex justify-center gap-3">
                <button
                    onClick={onReset}
                    className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
                >
                    Batch Upload Lagi
                </button>
                <Link
                    href="/dashboard/accounting/import/history"
                    className="rounded-md border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                    {ti?.viewHistory ?? "Lihat Riwayat"}
                </Link>
            </div>
        </div>
    );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
    const colors: Record<string, string> = {
        green: "text-success",
        blue: "text-info",
        purple: "text-purple",
        yellow: "text-warning",
        red: "text-error",
    };
    return (
        <div>
            <p className={`text-2xl font-bold ${colors[color] || "text-foreground"}`}>{value}</p>
            <p className="text-muted-foreground">{label}</p>
        </div>
    );
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
    return (
        <details className="mx-auto mt-4 max-w-lg rounded-lg border border-warning-border bg-warning-bg text-left">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-warning">
                Peringatan ({warnings.length})
            </summary>
            <div className="border-t border-warning-border px-4 py-2 text-sm text-warning">
                {warnings.slice(0, 10).map((w, i) => <p key={i}>{w}</p>)}
                {warnings.length > 10 && (
                    <p className="mt-1 text-xs">+{warnings.length - 10} lainnya</p>
                )}
            </div>
        </details>
    );
}
