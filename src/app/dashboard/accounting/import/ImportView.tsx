"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Loader2,
    ChevronDown, ArrowRight, History, Scan,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatIDR, Client } from "@/lib/data";
import { importDocumentEntries } from "@/app/actions/import-accounting";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-detector";
import type { DocumentType } from "@/lib/document-detector";
import type { GeneratedEntry } from "@/lib/journal-generator";
import { OcrScanner } from "@/components/dashboard/OcrScanner";

interface ImportViewProps {
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
}

type ImportStage = "upload" | "detection" | "preview" | "importing" | "result";

interface DetectionData {
    type: DocumentType;
    confidence: number;
    label: string;
    detectedColumns: string[];
    overridden: boolean;
}

interface ColumnMappingData {
    matched: { canonical: string; fileHeader: string; score: number }[];
    unmatched: string[];
    confidence: number;
}

interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
    batchId?: string;
}

const DOC_TYPES: DocumentType[] = [
    "cashier_report", "bank_statement", "invoice", "purchase_order",
    "expense_report", "payroll", "petty_cash", "tax_report",
];

type ImportMode = "spreadsheet" | "scan";

export function ImportView({ clients, defaultClientId, isClientRole }: ImportViewProps) {
    const { t, locale } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<ImportMode>("spreadsheet");
    const [clientId, setClientId] = useState(defaultClientId);
    const [stage, setStage] = useState<ImportStage>("upload");
    const [fileName, setFileName] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // Detection
    const [detection, setDetection] = useState<DetectionData | null>(null);
    const [columnMapping, setColumnMapping] = useState<ColumnMappingData | null>(null);
    const [selectedType, setSelectedType] = useState<DocumentType>("unknown");

    // Preview
    const [entries, setEntries] = useState<GeneratedEntry[]>([]);
    const [rawPreview, setRawPreview] = useState<Record<string, unknown>[]>([]);
    const [parseWarnings, setParseWarnings] = useState<string[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);

    // Result
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    const ti = t?.accounting?.import;

    const resetState = useCallback(() => {
        setStage("upload");
        setFileName("");
        setFile(null);
        setDetection(null);
        setColumnMapping(null);
        setSelectedType("unknown");
        setEntries([]);
        setRawPreview([]);
        setParseWarnings([]);
        setParseErrors([]);
        setResult(null);
        setError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    // Upload + detect
    const uploadFile = useCallback(async (uploadedFile: File, overrideType?: DocumentType) => {
        setError("");
        setParseErrors([]);

        if (!clientId) {
            setError(ti?.selectClientFirst ?? "Pilih klien terlebih dahulu.");
            return;
        }

        const ext = uploadedFile.name.split(".").pop()?.toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext || "")) {
            setError(ti?.invalidFormat ?? "Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv");
            return;
        }

        if (uploadedFile.size > 10 * 1024 * 1024) {
            setError(ti?.fileTooLarge ?? "Ukuran file melebihi batas 10 MB.");
            return;
        }

        setFileName(uploadedFile.name);
        setFile(uploadedFile);
        setStage("detection");

        const formData = new FormData();
        formData.append("file", uploadedFile);
        if (overrideType) formData.append("documentType", overrideType);

        try {
            const res = await fetch("/api/accounting/import", { method: "POST", body: formData });
            const json = await res.json();

            if (!json.success && json.errors?.length > 0) {
                setParseErrors(json.errors);
                setStage("upload");
                return;
            }

            setDetection(json.detection);
            setColumnMapping(json.columnMapping);
            setSelectedType(json.detection?.type || "unknown");
            setEntries(json.entries || []);
            setRawPreview(json.rawPreview || []);
            setParseWarnings(json.warnings || []);
            setParseErrors(json.errors || []);

            // If confidence >= 70%, go straight to preview
            if ((json.detection?.confidence || 0) >= 70 && !overrideType) {
                setStage("preview");
            } else {
                setStage("detection");
            }
        } catch {
            setError("Gagal mengunggah file. Coba lagi.");
            setStage("upload");
        }
    }, [clientId, ti]);

    // Re-parse with a different document type
    const reParseAs = useCallback(async (newType: DocumentType) => {
        if (!file) return;
        setSelectedType(newType);
        await uploadFile(file, newType);
    }, [file, uploadFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) uploadFile(f);
    }, [uploadFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) uploadFile(f);
    }, [uploadFile]);

    // Confirm import
    const handleImport = useCallback(async () => {
        if (!clientId || entries.length === 0) return;

        setStage("importing");
        setError("");

        try {
            const res = await importDocumentEntries(entries, clientId, selectedType, fileName);
            setResult({
                imported: res.imported,
                skipped: res.skipped,
                errors: res.errors,
                batchId: res.batchId,
            });
            setStage("result");
        } catch {
            setError("Terjadi kesalahan saat mengimpor.");
            setStage("preview");
        }
    }, [clientId, entries, selectedType, fileName]);

    const confidenceColor = (c: number) =>
        c >= 80 ? "text-green-600" : c >= 50 ? "text-yellow-600" : "text-red-600";

    const confidenceBg = (c: number) =>
        c >= 80 ? "bg-green-100 dark:bg-green-900/20" : c >= 50 ? "bg-yellow-100 dark:bg-yellow-900/20" : "bg-red-100 dark:bg-red-900/20";

    return (
        <div className="space-y-6">
            {/* Header with mode tabs + history link */}
            <div className="flex items-center justify-between">
                <div className="flex rounded-lg border border-border bg-card p-1">
                    <button
                        onClick={() => { setMode("spreadsheet"); resetState(); }}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            mode === "spreadsheet"
                                ? "bg-accent text-white"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Spreadsheet
                    </button>
                    <button
                        onClick={() => { setMode("scan"); resetState(); }}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            mode === "scan"
                                ? "bg-accent text-white"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Upload className="h-4 w-4" />
                        {locale === "id" ? "Scan OCR" : "OCR Scan"}
                    </button>
                </div>
                <Link
                    href="/dashboard/accounting/import/history"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <History className="h-4 w-4" />
                    {ti?.history ?? "Riwayat Import"}
                </Link>
            </div>

            {/* OCR Scan mode */}
            {mode === "scan" && (
                <OcrScanner />
            )}

            {/* Client selector */}
            {mode === "spreadsheet" && !isClientRole && (
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

            {/* Upload Stage */}
            {mode === "spreadsheet" && stage === "upload" && (
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
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-medium text-foreground">
                        {ti?.dragDrop ?? "Seret & lepas file di sini"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ti?.orClick ?? "atau klik untuk memilih file"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {ti?.supportedFormats ?? "Format: .xlsx, .xls, .csv (maks. 10 MB)"}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                        {DOC_TYPES.map((dt) => (
                            <span key={dt} className="rounded-full bg-muted px-2 py-0.5">
                                {DOCUMENT_TYPE_LABELS[dt][locale] || DOCUMENT_TYPE_LABELS[dt].id}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Error display */}
            {(error || parseErrors.length > 0) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div className="text-sm text-red-700 dark:text-red-400">
                            {error && <p>{error}</p>}
                            {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
                        </div>
                    </div>
                </div>
            )}

            {/* Detection Stage — low confidence, ask user to pick type */}
            {stage === "detection" && detection && (
                <div className="space-y-4">
                    <FileInfoBar fileName={fileName} subtitle={`${ti?.detected ?? "Terdeteksi"}: ${detection.label}`} onClose={resetState} />

                    <div className={`rounded-lg border p-4 ${confidenceBg(detection.confidence)}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">
                                    {ti?.autoDetected ?? "Auto-deteksi"}:{" "}
                                    <span className="font-bold">
                                        {DOCUMENT_TYPE_LABELS[detection.type]?.[locale] || detection.label}
                                    </span>
                                </p>
                                <p className={`text-sm font-bold ${confidenceColor(detection.confidence)}`}>
                                    {ti?.confidence ?? "Confidence"}: {detection.confidence}%
                                </p>
                            </div>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {ti?.lowConfidence ?? "Confidence rendah. Pilih tipe dokumen yang benar:"}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {DOC_TYPES.map((dt) => (
                                <button
                                    key={dt}
                                    onClick={() => reParseAs(dt)}
                                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                                        selectedType === dt
                                            ? "border-accent bg-accent/10 font-medium text-accent"
                                            : "border-border bg-card text-foreground hover:bg-muted"
                                    }`}
                                >
                                    {DOCUMENT_TYPE_LABELS[dt][locale] || DOCUMENT_TYPE_LABELS[dt].id}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Stage */}
            {stage === "preview" && entries.length > 0 && (
                <div className="space-y-4">
                    <FileInfoBar
                        fileName={fileName}
                        subtitle={`${DOCUMENT_TYPE_LABELS[selectedType]?.[locale] || selectedType} — ${entries.length} ${ti?.entriesGenerated ?? "jurnal akan dibuat"}`}
                        onClose={resetState}
                    />

                    {/* Detection badge */}
                    {detection && (
                        <div className="flex items-center gap-3 text-sm">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBg(detection.confidence)}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                {DOCUMENT_TYPE_LABELS[selectedType]?.[locale]} ({detection.confidence}%)
                            </span>
                            {detection.confidence < 70 && (
                                <button
                                    onClick={() => setStage("detection")}
                                    className="text-xs text-accent hover:underline"
                                >
                                    {ti?.changeType ?? "Ubah tipe"}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Warnings */}
                    {parseWarnings.length > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                                    <p className="mb-1 font-medium">{ti?.warnings ?? "Peringatan:"}</p>
                                    {parseWarnings.slice(0, 5).map((w, i) => <p key={i}>{w}</p>)}
                                    {parseWarnings.length > 5 && (
                                        <p className="mt-1 text-xs">+{parseWarnings.length - 5} lainnya</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Column mapping details */}
                    {columnMapping && (
                        <details className="rounded-lg border border-border bg-card">
                            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                                {ti?.columnMapping ?? "Pemetaan Kolom → Akun"}
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </summary>
                            <div className="border-t border-border px-4 py-3">
                                <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                                    {columnMapping.matched.map((m) => (
                                        <div key={m.canonical} className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{m.fileHeader}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{m.canonical}</span>
                                            <span className={`text-xs ${m.score >= 0.8 ? "text-green-600" : "text-yellow-600"}`}>
                                                ({Math.round(m.score * 100)}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {columnMapping.unmatched.length > 0 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {ti?.unmatchedCols ?? "Kolom tidak dipetakan"}: {columnMapping.unmatched.join(", ")}
                                    </p>
                                )}
                            </div>
                        </details>
                    )}

                    {/* Raw data preview */}
                    {rawPreview.length > 0 && (
                        <details className="rounded-lg border border-border bg-card">
                            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                                {ti?.rawPreview ?? "Preview Data Mentah"} ({ti?.firstRows ?? "5 baris pertama"})
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </summary>
                            <div className="overflow-x-auto border-t border-border">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            {Object.keys(rawPreview[0]).map((h) => (
                                                <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {rawPreview.map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} className="px-2 py-1.5 whitespace-nowrap">{String(v ?? "")}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    )}

                    {/* Generated journal entries preview */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">#</th>
                                    <th className="px-3 py-2 text-left font-medium">{ti?.date ?? "Tanggal"}</th>
                                    <th className="px-3 py-2 text-left font-medium">{ti?.description ?? "Deskripsi"}</th>
                                    <th className="px-3 py-2 text-right font-medium">Debit</th>
                                    <th className="px-3 py-2 text-right font-medium">Kredit</th>
                                    <th className="px-3 py-2 text-center font-medium">{ti?.status ?? "Status"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {entries.map((entry, i) => (
                                    <tr key={i} className={!entry.balanced ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{entry.date}</td>
                                        <td className="px-3 py-2 max-w-xs truncate">{entry.description}</td>
                                        <td className="px-3 py-2 text-right">{formatIDR(entry.totalDebit)}</td>
                                        <td className="px-3 py-2 text-right">{formatIDR(entry.totalCredit)}</td>
                                        <td className="px-3 py-2 text-center">
                                            {entry.balanced ? (
                                                <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                                            ) : (
                                                <AlertTriangle className="mx-auto h-4 w-4 text-yellow-600" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Validation summary */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                        <div className="flex gap-4">
                            <span className="text-green-600 font-medium">
                                {entries.filter((e) => e.balanced).length} {ti?.balanced ?? "seimbang"}
                            </span>
                            {entries.some((e) => !e.balanced) && (
                                <span className="text-yellow-600 font-medium">
                                    {entries.filter((e) => !e.balanced).length} {ti?.unbalanced ?? "tidak seimbang"}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={resetState}
                                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                            >
                                {ti?.cancel ?? "Batal"}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={entries.filter((e) => e.balanced).length === 0}
                                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                            >
                                {ti?.importButton ?? "Impor"} {entries.filter((e) => e.balanced).length} {ti?.entriesLabel ?? "Entri"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Importing Stage */}
            {stage === "importing" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12">
                    <Loader2 className="h-12 w-12 animate-spin text-accent" />
                    <p className="mt-4 text-lg font-medium text-foreground">
                        {ti?.importing ?? "Mengimpor data..."}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ti?.pleaseWait ?? "Harap tunggu, proses ini mungkin memakan waktu."}
                    </p>
                </div>
            )}

            {/* Result Stage */}
            {stage === "result" && result && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
                        <h2 className="mt-4 text-xl font-semibold text-foreground">
                            {ti?.complete ?? "Impor Selesai!"}
                        </h2>
                        <div className="mt-4 flex justify-center gap-8 text-sm">
                            <div>
                                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                                <p className="text-muted-foreground">{ti?.imported ?? "Diimpor"}</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                                <p className="text-muted-foreground">{ti?.skipped ?? "Dilewati"}</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                                <p className="text-muted-foreground">{ti?.errorsCount ?? "Error"}</p>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center gap-3">
                        <button
                            onClick={resetState}
                            className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
                        >
                            {ti?.importAnother ?? "Impor File Lain"}
                        </button>
                        <Link
                            href="/dashboard/accounting/import/history"
                            className="rounded-md border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                            {ti?.viewHistory ?? "Lihat Riwayat"}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Reusable sub-components ─────────────────────────────────────────────────

function FileInfoBar({ fileName, subtitle, onClose }: { fileName: string; subtitle: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                    <p className="font-medium text-foreground">{fileName}</p>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            <button onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
