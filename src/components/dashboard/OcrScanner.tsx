"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Camera, Upload, Loader2, FileText, AlertTriangle,
    CheckCircle2, X, Copy, Download, Eye, EyeOff,
    Scan, RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatIDR } from "@/lib/data";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-detector";
import type { DocumentType } from "@/lib/document-detector";

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
}

type ScanStage = "idle" | "scanning" | "result";

export function OcrScanner() {
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

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
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
                            accept="image/*,.pdf"
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
                            JPG, PNG, WebP, BMP (max 10 MB)
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
                                        OCR: {result.ocrConfidence}%
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {result.wordCount} {locale === "id" ? "kata" : "words"}
                                    </span>
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
