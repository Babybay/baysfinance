"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
    Search, FileText, Download, Eye, Trash2, Upload, FolderOpen,
    Plus, Filter, Calendar, Link2, X, FileImage, File, ExternalLink,
    ScanLine, Loader2, CheckCircle2, AlertTriangle, Receipt,
    ArrowRight, CircleDot,
} from "lucide-react";
import { AccountingDocument, Client, formatIDR } from "@/lib/data";
import { AccDocType, AccDocModule } from "@prisma/client";
import {
    getAccountingDocuments,
    uploadAccountingDocument,
    deleteAccountingDocument,
} from "@/app/actions/accounting-documents";
import { useRouter } from "next/navigation";

// ─── HELPERS: Presigned URL ──────────────────────────────────────────────────

/** Open a presigned URL in a new tab (the API route handles URL-to-key extraction) */
async function openPresigned(fileUrl: string) {
    const res = await fetch(`/api/documents/presigned?key=${encodeURIComponent(fileUrl)}`);
    const data = await res.json();
    if (data.url) {
        window.open(data.url, "_blank");
    }
}

/** Get a presigned URL string (for <img src>) */
async function getPresignedSrc(fileUrl: string): Promise<string> {
    const res = await fetch(`/api/documents/presigned?key=${encodeURIComponent(fileUrl)}`);
    const data = await res.json();
    return data.url || "";
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const docTypeOptions = [
    { value: AccDocType.SalesInvoice, label: "Faktur Penjualan" },
    { value: AccDocType.PurchaseInvoice, label: "Faktur Pembelian" },
    { value: AccDocType.ExpenseReceipt, label: "Bukti Pengeluaran" },
    { value: AccDocType.BankStatement, label: "Rekening Koran" },
    { value: AccDocType.FinancialReport, label: "Laporan Keuangan" },
    { value: AccDocType.Other, label: "Lainnya" },
];

const moduleOptions = [
    { value: AccDocModule.Receivable, label: "Piutang" },
    { value: AccDocModule.Payable, label: "Hutang" },
    { value: AccDocModule.Expense, label: "Beban" },
    { value: AccDocModule.Cashflow, label: "Arus Kas" },
    { value: AccDocModule.FinancialReport, label: "Laporan Keuangan" },
];

const docTypeColors: Record<string, "info" | "success" | "warning" | "danger" | "default"> = {
    [AccDocType.SalesInvoice]: "success",
    [AccDocType.PurchaseInvoice]: "info",
    [AccDocType.ExpenseReceipt]: "warning",
    [AccDocType.BankStatement]: "default",
    [AccDocType.FinancialReport]: "danger",
    [AccDocType.Other]: "default",
};

const moduleColors: Record<string, "info" | "success" | "warning" | "danger" | "default"> = {
    [AccDocModule.Receivable]: "success",
    [AccDocModule.Payable]: "info",
    [AccDocModule.Expense]: "warning",
    [AccDocModule.Cashflow]: "default",
    [AccDocModule.FinancialReport]: "danger",
};

function getDocTypeLabel(type: string): string {
    return docTypeOptions.find((o) => o.value === type)?.label || type;
}
function getModuleLabel(mod: string): string {
    return moduleOptions.find((o) => o.value === mod)?.label || mod;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
    if (["jpg", "jpeg", "png"].includes(fileType)) return FileImage;
    return File;
}

function getOcrStatusBadge(status: string | null) {
    if (!status) return null;
    switch (status) {
        case "processing":
            return <Badge variant="warning">Scanning...</Badge>;
        case "done":
            return <Badge variant="success">Scanned</Badge>;
        case "failed":
            return <Badge variant="danger">Gagal</Badge>;
        default:
            return <Badge variant="default">{status}</Badge>;
    }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface AccountingDocumentsViewProps {
    initialDocuments: AccountingDocument[];
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
}

export function AccountingDocumentsView({
    initialDocuments,
    clients,
    defaultClientId,
    isClientRole,
}: AccountingDocumentsViewProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState<AccountingDocument[]>(initialDocuments);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterModule, setFilterModule] = useState("");
    const [selectedClientId, setSelectedClientId] = useState(defaultClientId);

    // Modals
    const [uploadOpen, setUploadOpen] = useState(false);
    const [detailDoc, setDetailDoc] = useState<AccountingDocument | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [scanResultDoc, setScanResultDoc] = useState<AccountingDocument | null>(null);

    // Scanning state
    const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());

    // Upload form
    const [uploadForm, setUploadForm] = useState({
        documentName: "",
        documentType: AccDocType.SalesInvoice as string,
        linkedModule: "",
        documentDate: new Date().toISOString().split("T")[0],
        description: "",
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load documents when client changes (admin)
    useEffect(() => {
        if (selectedClientId) {
            loadDocuments();
        } else {
            setDocuments([]);
        }
    }, [selectedClientId]);

    const loadDocuments = async () => {
        if (!selectedClientId) return;
        const res = await getAccountingDocuments(selectedClientId, {
            search: search || undefined,
            documentType: filterType as AccDocType || undefined,
            linkedModule: filterModule as AccDocModule || undefined,
        });
        if (res.success) {
            setDocuments(res.data as unknown as AccountingDocument[]);
        }
    };

    // Re-search when filters change
    useEffect(() => {
        if (selectedClientId) {
            const timeout = setTimeout(loadDocuments, 300);
            return () => clearTimeout(timeout);
        }
    }, [search, filterType, filterModule]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return;
        setIsUploading(true);

        const clientIdToUse = isClientRole ? defaultClientId : selectedClientId;

        for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("documentName", selectedFiles.length === 1 ? uploadForm.documentName : `${uploadForm.documentName} - ${file.name}`);
            formData.append("documentType", uploadForm.documentType);
            if (uploadForm.linkedModule) formData.append("linkedModule", uploadForm.linkedModule);
            formData.append("clientId", clientIdToUse);
            formData.append("documentDate", uploadForm.documentDate);
            if (uploadForm.description) formData.append("description", uploadForm.description);

            const res = await uploadAccountingDocument(formData);
            if (!res.success) {
                alert(`Gagal upload ${file.name}: ${res.error}`);
            }
        }

        setIsUploading(false);
        setUploadOpen(false);
        setSelectedFiles([]);
        setUploadForm({
            documentName: "",
            documentType: AccDocType.SalesInvoice,
            linkedModule: "",
            documentDate: new Date().toISOString().split("T")[0],
            description: "",
        });
        loadDocuments();
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        const res = await deleteAccountingDocument(id);
        if (res.success) {
            setDocuments(documents.filter((d) => d.id !== id));
            setDeleteConfirm(null);
            setDetailDoc(null);
            router.refresh();
        } else {
            alert(res.error || "Gagal menghapus dokumen.");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase();
            return ext && ["pdf", "jpg", "jpeg", "png"].includes(ext);
        });
        setSelectedFiles((prev) => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Scan Invoice ─────────────────────────────────────────────────────────

    const handleScan = async (doc: AccountingDocument) => {
        setScanningIds((prev) => new Set(prev).add(doc.id));

        // Optimistic update
        setDocuments((prev) =>
            prev.map((d) => d.id === doc.id ? { ...d, ocrStatus: "processing" } : d)
        );

        try {
            const response = await fetch("/api/accounting/ocr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentId: doc.id }),
            });

            const result = await response.json();

            if (result.success) {
                // Update document in state
                setDocuments((prev) =>
                    prev.map((d) =>
                        d.id === doc.id
                            ? { ...d, ocrStatus: "done", ocrData: result.data }
                            : d
                    )
                );
                // Show result modal
                setScanResultDoc({ ...doc, ocrStatus: "done", ocrData: result.data });
            } else {
                setDocuments((prev) =>
                    prev.map((d) =>
                        d.id === doc.id
                            ? { ...d, ocrStatus: "failed", ocrData: { error: result.error } }
                            : d
                    )
                );
                alert(`Scan gagal: ${result.error || "Unknown error"}`);
            }
        } catch (err) {
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === doc.id
                        ? { ...d, ocrStatus: "failed", ocrData: { error: String(err) } }
                        : d
                )
            );
            alert("Scan gagal. Silakan coba lagi.");
        } finally {
            setScanningIds((prev) => {
                const next = new Set(prev);
                next.delete(doc.id);
                return next;
            });
        }
    };

    // ── Stats ────────────────────────────────────────────────────────────────

    const stats = {
        total: documents.length,
        scanned: documents.filter((d) => d.ocrStatus === "done").length,
        byType: docTypeOptions.map((t) => ({
            label: t.label,
            count: documents.filter((d) => d.documentType === t.value).length,
        })).filter((s) => s.count > 0),
    };

    const filtered = documents;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-serif text-foreground">Dokumen Akuntansi</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Kelola dokumen keuangan: faktur, bukti pengeluaran, rekening koran, dan laporan.
                    </p>
                </div>
                {selectedClientId && (
                    <Button variant="accent" onClick={() => setUploadOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Dokumen
                    </Button>
                )}
            </div>

            {/* Client Selector (admin only) */}
            {!isClientRole && (
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Klien</label>
                    <select
                        className="mt-1.5 w-full max-w-md bg-surface border border-border rounded-[8px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        <option value="">Pilih Klien...</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.nama} — {c.npwp}</option>
                        ))}
                    </select>
                </div>
            )}

            {!selectedClientId ? (
                <div className="bg-card rounded-[12px] border border-border p-12 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">Pilih klien untuk melihat dokumen akuntansi.</p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-card rounded-[12px] border border-border p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Dokumen</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-card rounded-[12px] border border-border p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sudah Di-scan</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.scanned}</p>
                        </div>
                        {stats.byType.slice(0, 2).map((s) => (
                            <div key={s.label} className="bg-card rounded-[12px] border border-border p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{s.count}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari nama dokumen..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="h-10 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                        >
                            <option value="">Semua Tipe</option>
                            {docTypeOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="h-10 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                        >
                            <option value="">Semua Modul</option>
                            {moduleOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Document Table */}
                    <div className="bg-card rounded-[12px] border border-border shadow-[var(--shadow-color)_0px_2px_8px_0px] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-surface">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Nama Dokumen</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Tipe</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Modul</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Tanggal</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">Scan</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">Ukuran</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                                <p>Belum ada dokumen akuntansi.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((doc) => {
                                            const Icon = getFileIcon(doc.fileType);
                                            const isScanning = scanningIds.has(doc.id);
                                            const canScan = ["jpg", "jpeg", "png", "pdf"].includes(doc.fileType) &&
                                                (doc.documentType === AccDocType.SalesInvoice ||
                                                 doc.documentType === AccDocType.PurchaseInvoice ||
                                                 doc.documentType === AccDocType.ExpenseReceipt);

                                            return (
                                                <tr key={doc.id} className="hover:bg-surface/60 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-[8px] bg-accent-muted flex items-center justify-center shrink-0">
                                                                <Icon className="h-4 w-4 text-accent" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">{doc.documentName}</p>
                                                                <p className="text-[11px] text-muted-foreground uppercase">{doc.fileType}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={docTypeColors[doc.documentType] || "default"}>
                                                            {getDocTypeLabel(doc.documentType)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        {doc.linkedModule ? (
                                                            <Badge variant={moduleColors[doc.linkedModule] || "default"}>
                                                                {getModuleLabel(doc.linkedModule)}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                                        {new Date(doc.documentDate).toLocaleDateString("id-ID")}
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        {doc.ocrStatus ? (
                                                            getOcrStatusBadge(doc.ocrStatus)
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                                                        {formatFileSize(doc.fileSize)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {/* Scan Button */}
                                                            {canScan && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (doc.ocrStatus === "done" && doc.ocrData) {
                                                                            setScanResultDoc(doc);
                                                                        } else {
                                                                            handleScan(doc);
                                                                        }
                                                                    }}
                                                                    disabled={isScanning}
                                                                    className="p-2 rounded-[8px] hover:bg-accent-muted text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                                                                    title={doc.ocrStatus === "done" ? "Lihat Hasil Scan" : "Scan Invoice"}
                                                                >
                                                                    {isScanning ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <ScanLine className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setDetailDoc(doc)}
                                                                className="p-2 rounded-[8px] hover:bg-accent-muted text-muted-foreground hover:text-accent transition-colors"
                                                                title="Detail"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openPresigned(doc.fileUrl)}
                                                                className="p-2 rounded-[8px] hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(doc.id)}
                                                                className="p-2 rounded-[8px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── Upload Modal ──────────────────────────────────────────────── */}
            <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Dokumen Akuntansi" size="lg">
                <form onSubmit={handleUpload} className="space-y-4">
                    <Input
                        label="Nama Dokumen"
                        value={uploadForm.documentName}
                        onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                        required
                        placeholder="Faktur Pembelian PT ABC - Jan 2026"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Tipe Dokumen"
                            value={uploadForm.documentType}
                            onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                            options={docTypeOptions}
                        />
                        <Select
                            label="Modul Terkait"
                            value={uploadForm.linkedModule}
                            onChange={(e) => setUploadForm({ ...uploadForm, linkedModule: e.target.value })}
                            options={moduleOptions}
                            placeholder="Opsional"
                        />
                    </div>
                    <Input
                        label="Tanggal Dokumen"
                        type="date"
                        value={uploadForm.documentDate}
                        onChange={(e) => setUploadForm({ ...uploadForm, documentDate: e.target.value })}
                        required
                    />

                    {/* Drag & Drop Zone */}
                    <div
                        className={`border-2 border-dashed rounded-[12px] p-6 text-center transition-colors cursor-pointer ${
                            dragOver
                                ? "border-accent bg-accent-muted/30"
                                : "border-border hover:border-accent/40"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
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
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Klik atau drag & drop file ke sini
                        </p>
                        <p className="text-xs text-muted-foreground opacity-60 mt-1">
                            PDF, JPG, PNG (maks 50MB per file)
                        </p>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {selectedFiles.length} file dipilih
                            </p>
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-surface rounded-[8px] border border-border">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-accent shrink-0" />
                                        <span className="text-sm text-foreground truncate">{file.name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                                    </div>
                                    <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-error-muted rounded-[6px] text-muted-foreground hover:text-error">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <Textarea
                        label="Deskripsi (Opsional)"
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                        placeholder="Catatan tambahan tentang dokumen ini..."
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={() => setUploadOpen(false)}>Batal</Button>
                        <Button
                            type="submit"
                            variant="accent"
                            isLoading={isUploading}
                            disabled={isUploading || selectedFiles.length === 0}
                        >
                            <Upload className="h-4 w-4 mr-1" /> Upload {selectedFiles.length > 1 ? `${selectedFiles.length} File` : "Dokumen"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Detail Modal ──────────────────────────────────────────────── */}
            <Modal isOpen={!!detailDoc} onClose={() => setDetailDoc(null)} title="Detail Dokumen" size="lg">
                {detailDoc && (
                    <div className="space-y-5">
                        {/* File Preview */}
                        <div className="bg-surface rounded-[12px] border border-border overflow-hidden">
                            {["jpg", "jpeg", "png"].includes(detailDoc.fileType) ? (
                                <PresignedImage
                                    fileUrl={detailDoc.fileUrl}
                                    alt={detailDoc.documentName}
                                    className="w-full max-h-[400px] object-contain bg-black/5"
                                />
                            ) : (
                                <div className="p-8 text-center">
                                    <File className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-40" />
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Preview tidak tersedia untuk file {detailDoc.fileType.toUpperCase()}.
                                    </p>
                                    <button
                                        onClick={() => openPresigned(detailDoc.fileUrl)}
                                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> Buka di tab baru
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Nama Dokumen</p>
                                <p className="font-medium text-sm text-foreground">{detailDoc.documentName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tipe Dokumen</p>
                                <Badge variant={docTypeColors[detailDoc.documentType]}>{getDocTypeLabel(detailDoc.documentType)}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Modul Terkait</p>
                                {detailDoc.linkedModule ? (
                                    <Badge variant={moduleColors[detailDoc.linkedModule]}>{getModuleLabel(detailDoc.linkedModule)}</Badge>
                                ) : (
                                    <p className="text-sm text-muted-foreground">-</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tanggal Dokumen</p>
                                <p className="font-medium text-sm text-foreground">
                                    {new Date(detailDoc.documentDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Diupload Oleh</p>
                                <p className="font-medium text-sm text-foreground">{detailDoc.uploadedBy}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Ukuran File</p>
                                <p className="font-medium text-sm text-foreground">{formatFileSize(detailDoc.fileSize)}</p>
                            </div>
                            {detailDoc.clientName && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Klien</p>
                                    <p className="font-medium text-sm text-foreground">{detailDoc.clientName}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground">Status Scan</p>
                                {detailDoc.ocrStatus ? getOcrStatusBadge(detailDoc.ocrStatus) : (
                                    <p className="text-sm text-muted-foreground">Belum di-scan</p>
                                )}
                            </div>
                        </div>

                        {detailDoc.description && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                                <p className="text-sm text-foreground">{detailDoc.description}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                            <button
                                onClick={() => openPresigned(detailDoc.fileUrl)}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[8px] bg-accent text-white hover:bg-accent-hover transition-colors"
                            >
                                <Download className="h-4 w-4 mr-1.5" /> Download
                            </button>
                            {/* Scan from detail modal */}
                            {["jpg", "jpeg", "png", "pdf"].includes(detailDoc.fileType) && (
                                <Button
                                    variant="soft"
                                    size="default"
                                    onClick={() => {
                                        if (detailDoc.ocrStatus === "done" && detailDoc.ocrData) {
                                            setDetailDoc(null);
                                            setScanResultDoc(detailDoc);
                                        } else {
                                            handleScan(detailDoc);
                                        }
                                    }}
                                    disabled={scanningIds.has(detailDoc.id)}
                                >
                                    {scanningIds.has(detailDoc.id) ? (
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    ) : (
                                        <ScanLine className="h-4 w-4 mr-1.5" />
                                    )}
                                    {detailDoc.ocrStatus === "done" ? "Lihat Hasil Scan" : "Scan Invoice"}
                                </Button>
                            )}
                            <Button
                                variant="soft"
                                size="default"
                                onClick={() => {
                                    setDeleteConfirm(detailDoc.id);
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Scan Result Modal ──────────────────────────────────────────── */}
            <Modal
                isOpen={!!scanResultDoc}
                onClose={() => setScanResultDoc(null)}
                title="Hasil Scan Invoice"
                size="lg"
            >
                {scanResultDoc?.ocrData && (
                    <ScanResultPanel
                        doc={scanResultDoc}
                        onClose={() => setScanResultDoc(null)}
                        onRescan={() => {
                            setScanResultDoc(null);
                            handleScan(scanResultDoc);
                        }}
                    />
                )}
            </Modal>

            {/* ── Delete Confirmation ──────────────────────────────────────── */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Konfirmasi Hapus" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="soft" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                        <Button
                            variant="accent"
                            className="!bg-error hover:!bg-error/90"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            <Trash2 className="h-4 w-4 mr-1" /> Hapus Dokumen
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ─── SCAN RESULT PANEL ───────────────────────────────────────────────────────

interface ScanResultPanelProps {
    doc: AccountingDocument;
    onClose: () => void;
    onRescan: () => void;
}

function ScanResultPanel({ doc, onClose, onRescan }: ScanResultPanelProps) {
    const data = doc.ocrData as Record<string, any>;

    const confidence = data?.confidence ?? 0;
    const invoiceNumber = data?.invoiceNumber ?? null;
    const invoiceDate = data?.invoiceDate ?? null;
    const dueDate = data?.dueDate ?? null;
    const vendorName = data?.vendorName ?? null;
    const vendorAddress = data?.vendorAddress ?? null;
    const customerName = data?.customerName ?? null;
    const lineItems = (data?.lineItems ?? []) as Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
    }>;
    const subtotal = data?.subtotal ?? null;
    const taxAmount = data?.taxAmount ?? null;
    const taxRate = data?.taxRate ?? null;
    const grandTotal = data?.grandTotal ?? null;
    const currency = data?.currency ?? "IDR";

    const fmt = (n: number | null) => {
        if (n === null) return "-";
        if (currency === "IDR") return formatIDR(n);
        return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-5">
            {/* Confidence bar */}
            <div className="bg-surface rounded-[12px] border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Akurasi Scan</p>
                    <span className={`text-sm font-bold ${
                        confidence >= 70 ? "text-success" : confidence >= 40 ? "text-warning" : "text-error"
                    }`}>
                        {confidence}%
                    </span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            confidence >= 70 ? "bg-success" : confidence >= 40 ? "bg-warning" : "bg-error"
                        }`}
                        style={{ width: `${confidence}%` }}
                    />
                </div>
                {confidence < 50 && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Akurasi rendah. Periksa dan koreksi data secara manual.
                    </p>
                )}
            </div>

            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-muted-foreground">No. Faktur</p>
                    <p className="font-medium text-sm text-foreground">{invoiceNumber || "-"}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Tanggal Faktur</p>
                    <p className="font-medium text-sm text-foreground">
                        {invoiceDate ? new Date(invoiceDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Vendor / Pengirim</p>
                    <p className="font-medium text-sm text-foreground">{vendorName || "-"}</p>
                    {vendorAddress && <p className="text-xs text-muted-foreground mt-0.5">{vendorAddress}</p>}
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Customer / Penerima</p>
                    <p className="font-medium text-sm text-foreground">{customerName || "-"}</p>
                </div>
                {dueDate && (
                    <div>
                        <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                        <p className="font-medium text-sm text-foreground">
                            {new Date(dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>
                )}
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Item Faktur</p>
                    <div className="bg-surface rounded-[12px] border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Deskripsi</th>
                                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Qty</th>
                                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Harga Satuan</th>
                                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {lineItems.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-foreground">{item.description}</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">{fmt(item.unitPrice)}</td>
                                        <td className="px-3 py-2 text-right font-medium text-foreground">{fmt(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Totals */}
            <div className="bg-surface rounded-[12px] border border-border p-4 space-y-2">
                {subtotal !== null && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (DPP)</span>
                        <span className="font-medium text-foreground">{fmt(subtotal)}</span>
                    </div>
                )}
                {taxAmount !== null && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            PPN{taxRate ? ` (${taxRate}%)` : ""}
                        </span>
                        <span className="font-medium text-foreground">{fmt(taxAmount)}</span>
                    </div>
                )}
                {grandTotal !== null && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <span className="font-bold text-foreground">Grand Total</span>
                        <span className="font-bold text-lg text-accent">{fmt(grandTotal)}</span>
                    </div>
                )}
                {grandTotal === null && subtotal === null && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                        Tidak dapat mendeteksi total. Periksa dokumen secara manual.
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                <Button variant="soft" size="default" onClick={onRescan}>
                    <ScanLine className="h-4 w-4 mr-1.5" /> Scan Ulang
                </Button>
                <Button variant="soft" size="default" onClick={onClose}>
                    Tutup
                </Button>
            </div>
        </div>
    );
}

// ─── PRESIGNED IMAGE ────────────────────────────────────────────────────────

function PresignedImage({ fileUrl, alt, className }: { fileUrl: string; alt: string; className?: string }) {
    const [src, setSrc] = React.useState<string>("");
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        getPresignedSrc(fileUrl).then((url) => {
            if (!cancelled) {
                setSrc(url);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [fileUrl]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!src) return null;

    return <img src={src} alt={alt} className={className} />;
}
