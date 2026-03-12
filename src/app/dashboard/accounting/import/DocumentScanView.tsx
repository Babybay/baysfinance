"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    ScanLine, Upload, Loader2, CheckCircle2, AlertTriangle, X,
    FileImage, File, Receipt, ArrowRight, RotateCcw, Eye,
    BookOpen, CreditCard, FileText, Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Client, formatIDR } from "@/lib/data";
import { AccDocType, AccDocModule } from "@prisma/client";
import { uploadAccountingDocument, postScannedEntries } from "@/app/actions/accounting-documents";
import type { GeneratedEntry } from "@/lib/journal-generator";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ScannedLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

interface ScannedTransaction {
    date: string | null;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
}

interface SuggestedJournalEntry {
    description: string;
    items: { accountCode: string; accountName: string; debit: number; credit: number }[];
}

interface ClassificationInfo {
    accDocType: AccDocType;
    accDocModule: AccDocModule;
    confidence: number;
    label: string;
}

interface ScannedDocumentData {
    documentType: AccDocType;
    detectedType: string;
    confidence: number;
    date: string | null;
    description: string | null;
    referenceNumber: string | null;
    counterpartyName: string | null;
    totalAmount: number | null;
    taxAmount: number | null;
    subtotal: number | null;
    lineItems: ScannedLineItem[];
    transactions: ScannedTransaction[];
    suggestedEntries: SuggestedJournalEntry[];
    rawText: string;
    classification?: ClassificationInfo;
    journalEntries?: GeneratedEntry[];
}

type ScanStage = "upload" | "uploading" | "scanning" | "result";

interface ScanResult {
    documentId: string;
    documentName: string;
    data: ScannedDocumentData;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const docTypeOptions = [
    { value: "auto", label: "Auto-Detect (Otomatis)" },
    { value: AccDocType.PurchaseInvoice, label: "Faktur Pembelian" },
    { value: AccDocType.SalesInvoice, label: "Faktur Penjualan" },
    { value: AccDocType.ExpenseReceipt, label: "Bukti Pengeluaran / Kwitansi" },
    { value: AccDocType.BankStatement, label: "Rekening Koran" },
    { value: AccDocType.Other, label: "Lainnya" },
];

const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
    SalesInvoice: <Receipt className="h-4 w-4" />,
    PurchaseInvoice: <FileText className="h-4 w-4" />,
    ExpenseReceipt: <CreditCard className="h-4 w-4" />,
    BankStatement: <BookOpen className="h-4 w-4" />,
    Other: <File className="h-4 w-4" />,
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getModuleForType(docType: string): AccDocModule {
    switch (docType) {
        case AccDocType.SalesInvoice: return AccDocModule.Receivable;
        case AccDocType.PurchaseInvoice: return AccDocModule.Payable;
        case AccDocType.ExpenseReceipt: return AccDocModule.Expense;
        case AccDocType.BankStatement: return AccDocModule.Cashflow;
        default: return AccDocModule.Expense;
    }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface DocumentScanViewProps {
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
}

export function DocumentScanView({ clients, defaultClientId, isClientRole }: DocumentScanViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [clientId, setClientId] = useState(defaultClientId);
    const [stage, setStage] = useState<ScanStage>("upload");
    const [error, setError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [docType, setDocType] = useState<string>("auto");

    const [results, setResults] = useState<ScanResult[]>([]);
    const [activeResultIdx, setActiveResultIdx] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [postingId, setPostingId] = useState<string | null>(null);
    const [postResult, setPostResult] = useState<Record<string, { success: boolean; message: string }>>({});

    const resetState = useCallback(() => {
        setStage("upload");
        setError("");
        setSelectedFiles([]);
        setResults([]);
        setActiveResultIdx(0);
        setProgressText("");
        setPostingId(null);
        setPostResult({});
    }, []);

    // ── File selection ───────────────────────────────────────────────────────

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase();
            return ext && ["pdf", "jpg", "jpeg", "png"].includes(ext);
        });
        setSelectedFiles((prev) => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Scan flow ────────────────────────────────────────────────────────────

    const handleScan = async () => {
        if (selectedFiles.length === 0 || !clientId) return;

        setError("");
        setStage("uploading");
        const scanResults: ScanResult[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setProgressText(`Mengupload ${i + 1}/${selectedFiles.length}: ${file.name}...`);

            const uploadDocType = docType === "auto" ? AccDocType.Other : docType;
            const formData = new FormData();
            formData.append("file", file);
            formData.append("documentName", file.name.replace(/\.[^.]+$/, ""));
            formData.append("documentType", uploadDocType);
            formData.append("linkedModule", getModuleForType(uploadDocType));
            formData.append("clientId", clientId);
            formData.append("documentDate", new Date().toISOString().split("T")[0]);

            const uploadRes = await uploadAccountingDocument(formData);
            if (!uploadRes.success || !uploadRes.data) {
                setError(`Gagal upload ${file.name}: ${uploadRes.error}`);
                continue;
            }

            const docId = (uploadRes.data as any).id;
            const docName = (uploadRes.data as any).documentName || file.name;

            setStage("scanning");
            setProgressText(`Scanning ${i + 1}/${selectedFiles.length}: ${file.name}...`);

            try {
                const ocrRes = await fetch("/api/accounting/ocr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: docId }),
                });

                const ocrData = await ocrRes.json();
                if (ocrData.success) {
                    scanResults.push({
                        documentId: docId,
                        documentName: docName,
                        data: ocrData.data,
                    });
                } else {
                    scanResults.push({
                        documentId: docId,
                        documentName: docName,
                        data: emptyResult(ocrData.error || "Scan gagal"),
                    });
                }
            } catch (err) {
                scanResults.push({
                    documentId: docId,
                    documentName: docName,
                    data: emptyResult(String(err)),
                });
            }
        }

        setResults(scanResults);
        setStage("result");
        setProgressText("");
    };

    // ── Post to journal ──────────────────────────────────────────────────────

    const handlePost = async (result: ScanResult) => {
        if (!result.data.journalEntries || result.data.journalEntries.length === 0) return;

        setPostingId(result.documentId);

        const importDocType = mapAccDocTypeToImportType(result.data.documentType);

        const res = await postScannedEntries(
            result.documentId,
            result.data.journalEntries,
            clientId,
            importDocType as any,
        );

        const imported = "imported" in res ? res.imported : 0;
        const errors = "errors" in res ? (res.errors as string[]) : [];

        setPostResult((prev) => ({
            ...prev,
            [result.documentId]: {
                success: res.success,
                message: res.success
                    ? `${imported} jurnal berhasil diposting.`
                    : errors.join(", ") || ("error" in res ? String(res.error) : "Gagal posting."),
            },
        }));
        setPostingId(null);
    };

    // ── Format helper ────────────────────────────────────────────────────────

    const fmt = (n: number | null, currency = "IDR") => {
        if (n === null) return "-";
        if (currency === "IDR") return formatIDR(n);
        return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    };

    // ── Render: Upload stage ─────────────────────────────────────────────────

    if (stage === "upload") {
        return (
            <div className="space-y-6">
                {!isClientRole && (
                    <div className="bg-card rounded-[12px] border border-border p-4">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Klien</label>
                        <select
                            className="mt-1.5 w-full max-w-md bg-surface border border-border rounded-[8px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                        >
                            <option value="">Pilih Klien...</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>{c.nama} — {c.npwp}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="bg-card rounded-[12px] border border-border p-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipe Dokumen</label>
                    <select
                        className="mt-1.5 w-full max-w-md bg-surface border border-border rounded-[8px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                    >
                        {docTypeOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {docType === "auto" && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                            Tipe dokumen akan dideteksi otomatis dari hasil scan OCR.
                        </p>
                    )}
                </div>

                <div
                    className={`border-2 border-dashed rounded-[12px] p-8 text-center transition-colors cursor-pointer ${
                        isDragOver
                            ? "border-accent bg-accent-muted/30"
                            : "border-border hover:border-accent/40 bg-card"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setSelectedFiles((prev) => [...prev, ...files]);
                        }}
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-accent-muted flex items-center justify-center">
                            <ScanLine className="h-7 w-7 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Upload dokumen untuk di-scan
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Drag & drop atau klik untuk memilih file. PDF, JPG, PNG (maks 50MB).
                                <br />
                                Mendukung: faktur, kwitansi, rekening koran, dan dokumen keuangan lainnya.
                            </p>
                        </div>
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {selectedFiles.length} file dipilih
                        </p>
                        {selectedFiles.map((file, i) => {
                            const isImage = ["jpg", "jpeg", "png"].includes(
                                file.name.split(".").pop()?.toLowerCase() || ""
                            );
                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-card rounded-[8px] border border-border">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-[6px] bg-accent-muted flex items-center justify-center shrink-0">
                                            {isImage ? (
                                                <FileImage className="h-4 w-4 text-accent" />
                                            ) : (
                                                <File className="h-4 w-4 text-accent" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="p-1.5 hover:bg-error-muted rounded-[6px] text-muted-foreground hover:text-error transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="pt-4">
                            <Button
                                variant="accent"
                                onClick={handleScan}
                                disabled={!clientId || selectedFiles.length === 0}
                                className="w-full sm:w-auto"
                            >
                                <ScanLine className="h-4 w-4 mr-2" />
                                Scan {selectedFiles.length} Dokumen
                            </Button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-[8px] bg-error-muted border border-error/20 text-sm text-error">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    // ── Render: Uploading / Scanning ─────────────────────────────────────────

    if (stage === "uploading" || stage === "scanning") {
        return (
            <div className="bg-card rounded-[12px] border border-border p-12 text-center space-y-4">
                <Loader2 className="h-10 w-10 mx-auto text-accent animate-spin" />
                <div>
                    <p className="text-sm font-medium text-foreground">
                        {stage === "uploading" ? "Mengupload dokumen..." : "Memproses OCR..."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{progressText}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Proses ini mungkin memerlukan waktu beberapa saat tergantung ukuran dan jumlah file.
                </p>
            </div>
        );
    }

    // ── Render: Results ──────────────────────────────────────────────────────

    const activeResult = results[activeResultIdx];

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success-muted flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Scan selesai — {results.length} dokumen diproses
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.filter((r) => r.data.confidence >= 50).length} berhasil,{" "}
                            {results.filter((r) => r.data.confidence < 50).length} perlu review
                        </p>
                    </div>
                </div>
                <Button variant="soft" onClick={resetState}>
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Scan Lagi
                </Button>
            </div>

            {/* Result tabs (if multiple) */}
            {results.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {results.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveResultIdx(i)}
                            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm border transition-colors ${
                                i === activeResultIdx
                                    ? "border-accent bg-accent-muted text-accent font-medium"
                                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {DOC_TYPE_ICONS[r.data.documentType] || <File className="h-3.5 w-3.5" />}
                            <span className="truncate max-w-[140px]">{r.documentName}</span>
                            {r.data.confidence >= 50 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                            ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Active result detail */}
            {activeResult && (
                <div className="space-y-5">
                    {/* Classification + Confidence */}
                    <div className="bg-card rounded-[12px] border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {DOC_TYPE_ICONS[activeResult.data.documentType] || <File className="h-4 w-4" />}
                                <span className="text-sm font-medium text-foreground">
                                    {activeResult.data.classification?.label || activeResult.data.detectedType}
                                </span>
                            </div>
                            <span className={`text-sm font-bold ${
                                activeResult.data.confidence >= 70 ? "text-success"
                                    : activeResult.data.confidence >= 40 ? "text-warning"
                                    : "text-error"
                            }`}>
                                {activeResult.data.confidence}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    activeResult.data.confidence >= 70 ? "bg-success"
                                        : activeResult.data.confidence >= 40 ? "bg-warning"
                                        : "bg-error"
                                }`}
                                style={{ width: `${activeResult.data.confidence}%` }}
                            />
                        </div>
                        {activeResult.data.confidence < 50 && (
                            <p className="text-xs text-warning mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Akurasi rendah. Periksa dan koreksi data secara manual.
                            </p>
                        )}
                    </div>

                    {/* Document info */}
                    <div className="bg-card rounded-[12px] border border-border p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Informasi Dokumen
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <FieldDisplay label="No. Referensi" value={activeResult.data.referenceNumber} />
                            <FieldDisplay
                                label="Tanggal"
                                value={activeResult.data.date
                                    ? new Date(activeResult.data.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                    : null
                                }
                            />
                            <FieldDisplay label="Pihak Terkait" value={activeResult.data.counterpartyName} />
                            {activeResult.data.description && (
                                <FieldDisplay label="Keterangan" value={activeResult.data.description} />
                            )}
                        </div>
                    </div>

                    {/* Line items (invoices/receipts) */}
                    {activeResult.data.lineItems.length > 0 && (
                        <div className="bg-card rounded-[12px] border border-border overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Item ({activeResult.data.lineItems.length})
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-surface">
                                            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Deskripsi</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Qty</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Harga Satuan</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {activeResult.data.lineItems.map((item, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2.5 text-foreground">{item.description}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(item.unitPrice)}</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Transactions (bank statements) */}
                    {activeResult.data.transactions.length > 0 && (
                        <div className="bg-card rounded-[12px] border border-border overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Transaksi ({activeResult.data.transactions.length})
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-surface">
                                            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Tanggal</th>
                                            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Keterangan</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Debit</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Kredit</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {activeResult.data.transactions.map((tx, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                                    {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-"}
                                                </td>
                                                <td className="px-4 py-2.5 text-foreground">{tx.description}</td>
                                                <td className="px-4 py-2.5 text-right text-error">{tx.debit ? fmt(tx.debit) : "-"}</td>
                                                <td className="px-4 py-2.5 text-right text-success">{tx.credit ? fmt(tx.credit) : "-"}</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-foreground">{tx.balance ? fmt(tx.balance) : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Totals (for invoices/receipts) */}
                    {(activeResult.data.totalAmount !== null || activeResult.data.subtotal !== null) && (
                        <div className="bg-card rounded-[12px] border border-border p-4 space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Ringkasan
                            </p>
                            {activeResult.data.subtotal !== null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal (DPP)</span>
                                    <span className="font-medium text-foreground">{fmt(activeResult.data.subtotal)}</span>
                                </div>
                            )}
                            {activeResult.data.taxAmount !== null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">PPN</span>
                                    <span className="font-medium text-foreground">{fmt(activeResult.data.taxAmount)}</span>
                                </div>
                            )}
                            {activeResult.data.totalAmount !== null && (
                                <div className="flex items-center justify-between text-sm pt-2.5 border-t border-border">
                                    <span className="font-bold text-foreground">Total</span>
                                    <span className="font-bold text-lg text-accent">{fmt(activeResult.data.totalAmount)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Suggested Journal Entries */}
                    {activeResult.data.journalEntries && activeResult.data.journalEntries.length > 0 && (
                        <div className="bg-card rounded-[12px] border border-border overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Jurnal yang Disarankan
                                </p>
                                {!postResult[activeResult.documentId] && (
                                    <Button
                                        variant="accent"
                                        onClick={() => handlePost(activeResult)}
                                        disabled={postingId === activeResult.documentId}
                                    >
                                        {postingId === activeResult.documentId ? (
                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Send className="h-3.5 w-3.5 mr-1.5" />
                                        )}
                                        Post ke Jurnal
                                    </Button>
                                )}
                                {postResult[activeResult.documentId] && (
                                    <span className={`text-xs font-medium ${
                                        postResult[activeResult.documentId].success ? "text-success" : "text-error"
                                    }`}>
                                        {postResult[activeResult.documentId].message}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-surface">
                                            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Akun</th>
                                            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Kode</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Debit</th>
                                            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Kredit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {activeResult.data.journalEntries.flatMap((entry, ei) =>
                                            entry.items.map((item, ii) => (
                                                <tr key={`${ei}-${ii}`}>
                                                    <td className="px-4 py-2.5 text-foreground">{item.accountName}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground">{item.accountCode}</td>
                                                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                                                        {item.debit > 0 ? fmt(item.debit) : "-"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                                                        {item.credit > 0 ? fmt(item.credit) : "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-border bg-surface">
                                            <td colSpan={2} className="px-4 py-2.5 text-xs font-bold uppercase text-muted-foreground">Total</td>
                                            <td className="px-4 py-2.5 text-right font-bold text-foreground">
                                                {fmt(activeResult.data.journalEntries.reduce((s, e) => s + e.totalDebit, 0))}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold text-foreground">
                                                {fmt(activeResult.data.journalEntries.reduce((s, e) => s + e.totalCredit, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Raw text toggle */}
                    <RawTextToggle text={activeResult.data.rawText} />
                </div>
            )}
        </div>
    );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function FieldDisplay({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`text-sm mt-0.5 ${value ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {value || "-"}
            </p>
        </div>
    );
}

function RawTextToggle({ text }: { text: string }) {
    const [open, setOpen] = useState(false);

    if (!text || text.length < 10) return null;

    return (
        <div className="bg-card rounded-[12px] border border-border overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Lihat Teks Mentah (OCR)
                </span>
                <span className="text-xs">{open ? "Sembunyikan" : "Tampilkan"}</span>
            </button>
            {open && (
                <div className="px-4 pb-4">
                    <pre className="text-xs text-muted-foreground bg-surface rounded-[8px] p-3 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono">
                        {text}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function emptyResult(errorText: string): ScannedDocumentData {
    return {
        documentType: AccDocType.Other,
        detectedType: "Unknown",
        confidence: 0,
        date: null,
        description: null,
        referenceNumber: null,
        counterpartyName: null,
        totalAmount: null,
        taxAmount: null,
        subtotal: null,
        lineItems: [],
        transactions: [],
        suggestedEntries: [],
        rawText: errorText,
    };
}

function mapAccDocTypeToImportType(accDocType: AccDocType): string {
    switch (accDocType) {
        case AccDocType.SalesInvoice:
        case AccDocType.PurchaseInvoice:
            return "invoice";
        case AccDocType.ExpenseReceipt:
            return "expense_report";
        case AccDocType.BankStatement:
            return "bank_statement";
        default:
            return "unknown";
    }
}
