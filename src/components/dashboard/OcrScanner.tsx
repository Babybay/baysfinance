"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Camera, Upload, Loader2, FileText, AlertTriangle,
    CheckCircle2, X, Copy, Download, Eye, EyeOff,
    Scan, RefreshCw, BookOpen, ChevronDown, ChevronUp,
    Pencil, Plus, Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatIDR, Client } from "@/lib/data";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-detector";
import type { DocumentType } from "@/lib/document-detector";
import { importDocumentEntries } from "@/app/actions/import-accounting";
import type { GeneratedEntry } from "@/lib/journal-generator";

interface OcrField {
    label: string;
    value: string;
    confidence: number;
}

interface OcrRow {
    date?: string;
    description: string;
    amount: number;
    type: "debit" | "credit";
}

interface OcrResponse {
    rawText: string;
    ocrConfidence: number;
    documentType: DocumentType;
    typeConfidence: number;
    fields: OcrField[];
    rows: OcrRow[];
    warnings: string[];
    wordCount: number;
    method?: "ocr" | "pdf-text";
}

type ScanStage = "idle" | "scanning" | "result";

// ── Smart account mapping per document type ──────────────────────────────────

interface AccountMapping {
    debitCode: string;
    debitName: string;
    creditCode: string;
    creditName: string;
}

const DOC_TYPE_ACCOUNT_MAP: Record<DocumentType, { debit: AccountMapping; credit: AccountMapping }> = {
    invoice: {
        debit: { debitCode: "120", debitName: "Piutang Usaha", creditCode: "600", creditName: "Pendapatan Jasa" },
        credit: { debitCode: "300", debitName: "Utang Usaha", creditCode: "111", creditName: "Bank" },
    },
    bank_statement: {
        debit: { debitCode: "729", debitName: "Beban Lain-lain", creditCode: "111", creditName: "Bank" },
        credit: { debitCode: "111", debitName: "Bank", creditCode: "902", creditName: "Pendapatan Lainnya" },
    },
    cashier_report: {
        debit: { debitCode: "111", debitName: "Bank BNI Giro", creditCode: "600", creditName: "Pendapatan F&B" },
        credit: { debitCode: "111", debitName: "Bank BNI Giro", creditCode: "600", creditName: "Pendapatan F&B" },
    },
    tax_report: {
        debit: { debitCode: "321", debitName: "Utang Pajak", creditCode: "111", creditName: "Bank" },
        credit: { debitCode: "111", debitName: "Bank", creditCode: "320", creditName: "PPN Masukan" },
    },
    expense_report: {
        debit: { debitCode: "729", debitName: "Beban Lain-lain", creditCode: "100", creditName: "Kas" },
        credit: { debitCode: "100", debitName: "Kas", creditCode: "729", creditName: "Beban Lain-lain" },
    },
    payroll: {
        debit: { debitCode: "700", debitName: "Gaji dan Upah", creditCode: "300", creditName: "Utang Gaji" },
        credit: { debitCode: "300", debitName: "Utang Gaji", creditCode: "111", creditName: "Bank" },
    },
    petty_cash: {
        debit: { debitCode: "729", debitName: "Beban Lain-lain", creditCode: "100", creditName: "Kas Kecil" },
        credit: { debitCode: "100", debitName: "Kas Kecil", creditCode: "111", creditName: "Bank" },
    },
    purchase_order: {
        debit: { debitCode: "130", debitName: "Persediaan", creditCode: "300", creditName: "Utang Usaha" },
        credit: { debitCode: "300", debitName: "Utang Usaha", creditCode: "111", creditName: "Bank" },
    },
    unknown: {
        debit: { debitCode: "729", debitName: "Beban Lain-lain", creditCode: "100", creditName: "Kas" },
        credit: { debitCode: "100", debitName: "Kas", creditCode: "902", creditName: "Pendapatan Lainnya" },
    },
};

function buildSmartEntries(rows: OcrRow[], docType: DocumentType): GeneratedEntry[] {
    const mapping = DOC_TYPE_ACCOUNT_MAP[docType] || DOC_TYPE_ACCOUNT_MAP.unknown;

    return rows.map((row, i) => {
        const acctMap = row.type === "debit" ? mapping.debit : mapping.credit;
        return {
            date: row.date || new Date().toISOString().split("T")[0],
            description: row.description,
            items: [
                {
                    accountCode: acctMap.debitCode,
                    accountName: acctMap.debitName,
                    debit: row.amount,
                    credit: 0,
                },
                {
                    accountCode: acctMap.creditCode,
                    accountName: acctMap.creditName,
                    debit: 0,
                    credit: row.amount,
                },
            ],
            totalDebit: row.amount,
            totalCredit: row.amount,
            balanced: true,
            sourceRow: i + 1,
        };
    });
}

// ── Editable journal entry type ──────────────────────────────────────────────

interface EditableEntry extends GeneratedEntry {
    _expanded?: boolean;
    _removed?: boolean;
}

interface OcrScannerProps {
    clients?: Client[];
    defaultClientId?: string;
}

export function OcrScanner({ clients = [], defaultClientId = "" }: OcrScannerProps) {
    const { t, locale } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [stage, setStage] = useState<ScanStage>("idle");
    const [result, setResult] = useState<OcrResponse | null>(null);
    const [error, setError] = useState("");
    const [fileName, setFileName] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showRawText, setShowRawText] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [importClientId, setImportClientId] = useState(defaultClientId);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

    // ── Editable journal entries state ──
    const [journalEntries, setJournalEntries] = useState<EditableEntry[]>([]);
    const [showJournalPreview, setShowJournalPreview] = useState(false);

    const ti = t?.accounting?.import;

    const resetState = useCallback(() => {
        setStage("idle");
        setResult(null);
        setError("");
        setFileName("");
        setShowRawText(false);
        setScanProgress(0);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    }, [previewUrl]);

    const processFile = useCallback(async (file: File) => {
        setError("");
        setFileName(file.name);
        setStage("scanning");
        setScanProgress(0);

        // Create preview for images (not for PDFs)
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }

        // Simulate progress for UX (OCR takes time)
        const progressInterval = setInterval(() => {
            setScanProgress((p) => Math.min(p + 8, 90));
        }, 500);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/ocr", { method: "POST", body: formData });
            const json = await res.json();

            clearInterval(progressInterval);
            setScanProgress(100);

            if (!json.success) {
                setError(json.error || "OCR processing failed.");
                setStage("idle");
                return;
            }

            setResult(json.ocr);
            setStage("result");
        } catch {
            clearInterval(progressInterval);
            setError("Failed to process image. Please try again.");
            setStage("idle");
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, [processFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) processFile(f);
    }, [processFile]);

    const copyToClipboard = useCallback(() => {
        if (result?.rawText) {
            navigator.clipboard.writeText(result.rawText);
        }
    }, [result]);

    // Build journal entries when result changes
    const handlePrepareJournal = useCallback(() => {
        if (!result || result.rows.length === 0) return;
        const entries = buildSmartEntries(result.rows, result.documentType);
        setJournalEntries(entries.map(e => ({ ...e, _expanded: false, _removed: false })));
        setShowJournalPreview(true);
    }, [result]);

    // Edit an entry's field
    const updateEntry = (index: number, field: string, value: string) => {
        setJournalEntries(prev => prev.map((e, i) => {
            if (i !== index) return e;
            return { ...e, [field]: value };
        }));
    };

    // Edit an entry item's account or amount
    const updateEntryItem = (entryIdx: number, itemIdx: number, field: string, value: string | number) => {
        setJournalEntries(prev => prev.map((e, i) => {
            if (i !== entryIdx) return e;
            const items = [...e.items];
            items[itemIdx] = { ...items[itemIdx], [field]: value };
            // Recalculate totals
            const totalDebit = items.reduce((s, it) => s + (it.debit || 0), 0);
            const totalCredit = items.reduce((s, it) => s + (it.credit || 0), 0);
            return { ...e, items, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
        }));
    };

    // Add a line item to an entry
    const addEntryItem = (entryIdx: number) => {
        setJournalEntries(prev => prev.map((e, i) => {
            if (i !== entryIdx) return e;
            return { ...e, items: [...e.items, { accountCode: "", accountName: "", debit: 0, credit: 0 }] };
        }));
    };

    // Remove a line item from an entry
    const removeEntryItem = (entryIdx: number, itemIdx: number) => {
        setJournalEntries(prev => prev.map((e, i) => {
            if (i !== entryIdx || e.items.length <= 2) return e;
            const items = e.items.filter((_, j) => j !== itemIdx);
            const totalDebit = items.reduce((s, it) => s + (it.debit || 0), 0);
            const totalCredit = items.reduce((s, it) => s + (it.credit || 0), 0);
            return { ...e, items, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
        }));
    };

    // Toggle remove an entry
    const toggleRemoveEntry = (index: number) => {
        setJournalEntries(prev => prev.map((e, i) => i === index ? { ...e, _removed: !e._removed } : e));
    };

    // Toggle expand an entry
    const toggleExpandEntry = (index: number) => {
        setJournalEntries(prev => prev.map((e, i) => i === index ? { ...e, _expanded: !e._expanded } : e));
    };

    const handleImportToJournal = useCallback(async () => {
        if (!result || !importClientId) return;

        const entriesToImport = journalEntries.filter(e => !e._removed && e.balanced);
        if (entriesToImport.length === 0) return;

        setImporting(true);
        setImportResult(null);

        try {
            // Strip UI-only fields before sending
            const cleanEntries: GeneratedEntry[] = entriesToImport.map(({ _expanded, _removed, ...rest }) => rest);

            const res = await importDocumentEntries(
                cleanEntries,
                importClientId,
                result.documentType,
                `OCR-${fileName}`,
            );
            setImportResult({
                imported: res.imported,
                skipped: res.skipped,
                errors: res.errors,
            });
        } catch {
            setImportResult({ imported: 0, skipped: 0, errors: ["Gagal mengimpor ke jurnal."] });
        } finally {
            setImporting(false);
        }
    }, [result, importClientId, fileName, journalEntries]);

    const confidenceColor = (c: number) =>
        c >= 70 ? "text-green-600" : c >= 40 ? "text-yellow-600" : "text-red-600";

    const confidenceBg = (c: number) =>
        c >= 70 ? "bg-green-100 dark:bg-green-900/20" : c >= 40 ? "bg-yellow-100 dark:bg-yellow-900/20" : "bg-red-100 dark:bg-red-900/20";

    return (
        <div className="space-y-6">
            {/* Idle: Upload area */}
            {stage === "idle" && (
                <div className="space-y-4">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                            isDragOver
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50 hover:bg-muted/50"
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Scan className="mx-auto h-12 w-12 text-accent" />
                        <p className="mt-4 text-lg font-medium text-foreground">
                            {locale === "id" ? "Scan dokumen dengan foto" : "Scan document from photo"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {locale === "id"
                                ? "Upload foto struk, invoice, faktur pajak, atau dokumen keuangan"
                                : "Upload a photo of receipt, invoice, tax document, or financial document"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            JPG, PNG, WebP, BMP, PDF (max 10 MB)
                        </p>
                    </div>

                    {/* Camera capture button */}
                    <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground transition-colors hover:bg-muted"
                    >
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Camera className="h-5 w-5 text-accent" />
                        <span className="font-medium">
                            {locale === "id" ? "Ambil Foto dengan Kamera" : "Take Photo with Camera"}
                        </span>
                    </button>

                    {/* Supported document types */}
                    <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {locale === "id" ? "Dokumen yang didukung:" : "Supported documents:"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(["invoice", "bank_statement", "cashier_report", "tax_report", "expense_report", "payroll"] as DocumentType[]).map((dt) => (
                                <span key={dt} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                    {DOCUMENT_TYPE_LABELS[dt][locale] || DOCUMENT_TYPE_LABELS[dt].id}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                    </div>
                </div>
            )}

            {/* Scanning: Progress */}
            {stage === "scanning" && (
                <div className="rounded-xl border border-border bg-card p-8">
                    <div className="flex flex-col items-center">
                        {previewUrl && (
                            <div className="mb-6 w-full max-w-sm">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full rounded-lg border border-border object-contain max-h-48"
                                />
                            </div>
                        )}
                        <Loader2 className="h-10 w-10 animate-spin text-accent" />
                        <p className="mt-4 text-lg font-medium text-foreground">
                            {locale === "id" ? "Memproses OCR..." : "Processing OCR..."}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
                        {/* Progress bar */}
                        <div className="mt-4 w-full max-w-xs">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-accent transition-all duration-500"
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                            <p className="mt-1 text-center text-xs text-muted-foreground">{scanProgress}%</p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {locale === "id"
                                ? "Mengekstrak teks dari gambar menggunakan Tesseract OCR..."
                                : "Extracting text from image using Tesseract OCR..."}
                        </p>
                    </div>
                </div>
            )}

            {/* Result: Display extracted data */}
            {stage === "result" && result && (
                <div className="space-y-4">
                    {/* Header with confidence */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-accent" />
                            <div>
                                <p className="font-medium text-foreground">{fileName}</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBg(result.typeConfidence)}`}>
                                        <CheckCircle2 className="h-3 w-3" />
                                        {DOCUMENT_TYPE_LABELS[result.documentType]?.[locale] || result.documentType}
                                    </span>
                                    <span className={`text-xs ${confidenceColor(result.ocrConfidence)}`}>
                                        {result.method === "pdf-text" ? "PDF" : "OCR"}: {result.ocrConfidence}%
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {result.wordCount} {locale === "id" ? "kata" : "words"}
                                    </span>
                                    {result.method === "pdf-text" && (
                                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                            PDF Text Extract
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={resetState} className="rounded-md p-2 text-muted-foreground hover:bg-muted" title="Close">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Image preview + extracted fields side by side */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Image preview */}
                        {previewUrl && (
                            <div className="rounded-lg border border-border bg-card p-3">
                                <img
                                    src={previewUrl}
                                    alt="Scanned document"
                                    className="w-full rounded-md object-contain max-h-80"
                                />
                            </div>
                        )}

                        {/* Extracted fields */}
                        <div className="rounded-lg border border-border bg-card p-4">
                            <h3 className="mb-3 text-sm font-medium text-foreground">
                                {locale === "id" ? "Data Terdeteksi" : "Extracted Data"}
                            </h3>
                            {result.fields.length > 0 ? (
                                <div className="space-y-2">
                                    {result.fields.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-md bg-surface p-2.5">
                                            <span className="text-xs text-muted-foreground">{f.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">{f.value}</span>
                                                <span className={`text-xs ${confidenceColor(f.confidence * 100)}`}>
                                                    {Math.round(f.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {locale === "id" ? "Tidak ada field yang terdeteksi." : "No fields detected."}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                                    {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extracted rows / line items */}
                    {result.rows.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
                                <h3 className="text-sm font-medium text-foreground">
                                    {locale === "id" ? "Item Terdeteksi" : "Detected Line Items"} ({result.rows.length})
                                </h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            {ti?.date ?? "Tanggal"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            {ti?.description ?? "Deskripsi"}
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                            {locale === "id" ? "Jumlah" : "Amount"}
                                        </th>
                                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                                            {locale === "id" ? "Tipe" : "Type"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {result.rows.map((row, i) => (
                                        <tr key={i} className="hover:bg-muted/20">
                                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{row.date || "-"}</td>
                                            <td className="px-3 py-2 max-w-xs truncate">{row.description}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatIDR(row.amount)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    row.type === "credit"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                }`}>
                                                    {row.type === "credit" ? "Kredit" : "Debit"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {result.rows.length > 0 && (
                                    <tfoot className="border-t-2 border-border">
                                        <tr className="bg-muted/30">
                                            <td colSpan={3} className="px-3 py-2 text-right font-medium text-foreground">Total</td>
                                            <td className="px-3 py-2 text-right font-bold text-foreground">
                                                {formatIDR(result.rows.reduce((s, r) => s + r.amount, 0))}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}

                    {/* Raw OCR text (collapsible) */}
                    <div className="rounded-lg border border-border bg-card">
                        <button
                            onClick={() => setShowRawText(!showRawText)}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
                        >
                            <div className="flex items-center gap-2">
                                {showRawText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {locale === "id" ? "Teks OCR Mentah" : "Raw OCR Text"}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                                title="Copy"
                            >
                                <Copy className="h-3 w-3" />
                                Copy
                            </button>
                        </button>
                        {showRawText && (
                            <div className="border-t border-border p-4">
                                <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-surface p-3 text-xs text-foreground">
                                    {result.rawText}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* Import to Journal */}
                    {result.rows.length > 0 && clients.length > 0 && (
                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-accent" />
                                    {locale === "id" ? "Impor ke Jurnal Akuntansi" : "Import to Accounting Journal"}
                                </h3>
                                {!showJournalPreview && (
                                    <button
                                        onClick={handlePrepareJournal}
                                        className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                                    >
                                        <Pencil className="h-3 w-3" />
                                        {locale === "id" ? "Siapkan Jurnal" : "Prepare Journal"}
                                    </button>
                                )}
                            </div>

                            {/* Client selector */}
                            <div className="flex items-center gap-3">
                                <select
                                    value={importClientId}
                                    onChange={(e) => setImportClientId(e.target.value)}
                                    className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
                                >
                                    <option value="">{locale === "id" ? "— Pilih klien —" : "— Select client —"}</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nama}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Journal entries preview/editor */}
                            {showJournalPreview && journalEntries.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>
                                            {journalEntries.filter(e => !e._removed).length} {locale === "id" ? "entri jurnal" : "journal entries"}
                                            {journalEntries.some(e => !e.balanced && !e._removed) && (
                                                <span className="ml-2 text-red-500">
                                                    {locale === "id" ? "⚠ Ada entri tidak seimbang" : "⚠ Some entries are unbalanced"}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {locale === "id" ? "Klik untuk edit akun & jumlah" : "Click to edit accounts & amounts"}
                                        </span>
                                    </div>

                                    {journalEntries.map((entry, entryIdx) => (
                                        <div
                                            key={entryIdx}
                                            className={`rounded-lg border bg-card overflow-hidden transition-opacity ${
                                                entry._removed ? "opacity-40 border-border" : entry.balanced ? "border-border" : "border-red-300 dark:border-red-700"
                                            }`}
                                        >
                                            {/* Entry header */}
                                            <div
                                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                                                onClick={() => toggleExpandEntry(entryIdx)}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {entry._expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                                    <span className="text-xs font-mono text-muted-foreground">{entry.date}</span>
                                                    <span className="text-sm truncate text-foreground">{entry.description}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs font-medium text-foreground">{formatIDR(entry.totalDebit)}</span>
                                                    {!entry.balanced && !entry._removed && (
                                                        <span className="text-xs text-red-500 font-medium">
                                                            {locale === "id" ? "Tidak seimbang" : "Unbalanced"}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleRemoveEntry(entryIdx); }}
                                                        className={`p-1 rounded transition-colors ${entry._removed ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20" : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"}`}
                                                        title={entry._removed ? "Restore" : "Remove"}
                                                    >
                                                        {entry._removed ? <RefreshCw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded: editable items */}
                                            {entry._expanded && !entry._removed && (
                                                <div className="border-t border-border px-3 py-2 space-y-2">
                                                    {/* Edit description & date */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <input
                                                            type="date"
                                                            value={entry.date}
                                                            onChange={(e) => updateEntry(entryIdx, "date", e.target.value)}
                                                            className="col-span-1 rounded-md border border-border bg-surface px-2 py-1 text-xs"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={entry.description}
                                                            onChange={(e) => updateEntry(entryIdx, "description", e.target.value)}
                                                            className="col-span-2 rounded-md border border-border bg-surface px-2 py-1 text-xs"
                                                        />
                                                    </div>

                                                    {/* Line items header */}
                                                    <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase px-1">
                                                        <div className="col-span-2">Kode</div>
                                                        <div className="col-span-4">Nama Akun</div>
                                                        <div className="col-span-2 text-right">Debit</div>
                                                        <div className="col-span-2 text-right">Kredit</div>
                                                        <div className="col-span-2" />
                                                    </div>

                                                    {/* Line items */}
                                                    {entry.items.map((item, itemIdx) => (
                                                        <div key={itemIdx} className="grid grid-cols-12 gap-1 items-center">
                                                            <input
                                                                type="text"
                                                                value={item.accountCode}
                                                                onChange={(e) => updateEntryItem(entryIdx, itemIdx, "accountCode", e.target.value)}
                                                                className="col-span-2 rounded border border-border bg-surface px-1.5 py-1 text-xs font-mono"
                                                                placeholder="Kode"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={item.accountName}
                                                                onChange={(e) => updateEntryItem(entryIdx, itemIdx, "accountName", e.target.value)}
                                                                className="col-span-4 rounded border border-border bg-surface px-1.5 py-1 text-xs"
                                                                placeholder="Nama akun"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={item.debit || ""}
                                                                onChange={(e) => updateEntryItem(entryIdx, itemIdx, "debit", parseFloat(e.target.value) || 0)}
                                                                className="col-span-2 rounded border border-border bg-surface px-1.5 py-1 text-xs text-right"
                                                                placeholder="0"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={item.credit || ""}
                                                                onChange={(e) => updateEntryItem(entryIdx, itemIdx, "credit", parseFloat(e.target.value) || 0)}
                                                                className="col-span-2 rounded border border-border bg-surface px-1.5 py-1 text-xs text-right"
                                                                placeholder="0"
                                                            />
                                                            <div className="col-span-2 flex justify-end">
                                                                {entry.items.length > 2 && (
                                                                    <button
                                                                        onClick={() => removeEntryItem(entryIdx, itemIdx)}
                                                                        className="p-0.5 rounded text-muted-foreground hover:text-red-500"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Add item button + totals */}
                                                    <div className="flex items-center justify-between pt-1">
                                                        <button
                                                            onClick={() => addEntryItem(entryIdx)}
                                                            className="flex items-center gap-1 text-xs text-accent hover:underline"
                                                        >
                                                            <Plus className="h-3 w-3" /> {locale === "id" ? "Tambah baris" : "Add line"}
                                                        </button>
                                                        <div className="text-xs text-muted-foreground">
                                                            D: {formatIDR(entry.totalDebit)} | K: {formatIDR(entry.totalCredit)}
                                                            {entry.balanced ? (
                                                                <CheckCircle2 className="inline ml-1 h-3 w-3 text-green-500" />
                                                            ) : (
                                                                <AlertTriangle className="inline ml-1 h-3 w-3 text-red-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Import button */}
                            <button
                                onClick={showJournalPreview ? handleImportToJournal : handlePrepareJournal}
                                disabled={!importClientId || importing || (showJournalPreview && journalEntries.filter(e => !e._removed && e.balanced).length === 0)}
                                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                            >
                                {importing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <BookOpen className="h-4 w-4" />
                                )}
                                {showJournalPreview
                                    ? `${locale === "id" ? "Impor" : "Import"} ${journalEntries.filter(e => !e._removed && e.balanced).length} ${locale === "id" ? "entri ke jurnal" : "entries to journal"}`
                                    : `${locale === "id" ? "Siapkan & Impor" : "Prepare & Import"} ${result.rows.length} ${locale === "id" ? "entri" : "entries"}`
                                }
                            </button>

                            {importResult && (
                                <div className={`rounded-md p-3 text-sm ${importResult.errors.length > 0 && importResult.imported === 0 ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"}`}>
                                    {importResult.imported > 0 && <p>{importResult.imported} {locale === "id" ? "entri berhasil diimpor ke jurnal" : "entries imported to journal"}</p>}
                                    {importResult.skipped > 0 && <p>{importResult.skipped} {locale === "id" ? "dilewati (duplikat)" : "skipped (duplicates)"}</p>}
                                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={resetState}
                            className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
                        >
                            <RefreshCw className="h-4 w-4" />
                            {locale === "id" ? "Scan Dokumen Lain" : "Scan Another Document"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
