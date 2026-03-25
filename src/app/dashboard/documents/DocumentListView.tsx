"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Search, FileText, Download, Eye, Trash2, Upload, FolderOpen } from "lucide-react";
import { Document as DocType, Client } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";
import { uploadDocument, deleteDocument } from "@/app/actions/documents";
import { DocumentKategori } from "@prisma/client";
import { useRouter } from "next/navigation";

const kategoriOptions = [
    { value: DocumentKategori.FakturPajak, label: "Faktur Pajak" },
    { value: DocumentKategori.BuktiPotong, label: "Bukti Potong" },
    { value: DocumentKategori.SPT, label: "SPT" },
    { value: DocumentKategori.LaporanKeuangan, label: "Laporan Keuangan" },
    { value: DocumentKategori.Lainnya, label: "Lainnya" },
];

const kategoriColors: Record<string, "info" | "success" | "warning" | "danger" | "default"> = {
    [DocumentKategori.FakturPajak]: "info",
    [DocumentKategori.BuktiPotong]: "success",
    [DocumentKategori.SPT]: "warning",
    [DocumentKategori.LaporanKeuangan]: "danger",
    [DocumentKategori.Lainnya]: "default",
};

function formatFileSize(bytes: number | string): string {
    const b = Number(bytes);
    if (isNaN(b)) return String(bytes);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentListViewProps {
    initialDocuments: DocType[];
    clients: Client[];
}

export function DocumentListView({ initialDocuments, clients }: DocumentListViewProps) {
    const [documents, setDocuments] = useState<DocType[]>(initialDocuments);
    const [search, setSearch] = useState("");
    const [filterKategori, setFilterKategori] = useState("Semua");
    const [modalOpen, setModalOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<DocType | null>(null);
    const { role, clientId, isAdmin, isLoaded: roleLoaded } = useRoles();
    const router = useRouter();

    const handleDownload = async (fileUrl: string | undefined) => {
        if (!fileUrl) return;
        try {
            const res = await fetch(`/api/documents/presigned?key=${encodeURIComponent(fileUrl)}`);
            const data = await res.json();
            if (data.url) {
                window.open(data.url, "_blank");
            }
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const [form, setForm] = useState({
        nama: "",
        kategori: DocumentKategori.FakturPajak as DocType["kategori"],
        clientId: "",
        catatan: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("nama", form.nama);
        formData.append("kategori", form.kategori);
        formData.append("clientId", role === "client" ? (clientId || "") : form.clientId);
        formData.append("catatan", form.catatan);

        if (selectedFile) {
            formData.append("file", selectedFile);
        }

        const res = await uploadDocument(formData);
        if (res.success) {
            router.refresh(); // Refresh server data
            setModalOpen(false);
            setForm({ nama: "", kategori: DocumentKategori.FakturPajak, clientId: "", catatan: "" });
            setSelectedFile(null);
        } else {
            alert(res.error || "Gagal mengupload dokumen");
        }
    };

    const handleDelete = async (id: string) => {
        const res = await deleteDocument(id);
        if (res.success) {
            setDocuments(documents.filter((d) => d.id !== id));
            router.refresh();
        } else {
            alert(res.error || "Gagal menghapus dokumen");
        }
    };

    const filtered = documents.filter((d) => {
        const matchSearch = d.nama.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase());
        const matchKategori = filterKategori === "Semua" || d.kategori === filterKategori;
        return matchSearch && matchKategori;
    });

    if (!roleLoaded) {
        return <div className="flex items-center justify-center py-20 animate-pulse text-muted-foreground">Memuat...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manajemen Dokumen</h1>
                    <p className="text-sm text-muted-foreground mt-1">{isAdmin ? `${documents.length} dokumen tersimpan` : "Dokumen Anda"}</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                    <Upload className="h-4 w-4 mr-2" /> Upload Dokumen
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Cari dokumen atau klien..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40" />
                </div>
                <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}
                    className="h-10 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="Semua">Semua Kategori</option>
                    {kategoriOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
            </div>

            {/* Documents Grid */}
            {filtered.length === 0 ? (
                <div className="bg-card rounded-[12px] border border-border p-12 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">Tidak ada dokumen ditemukan</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((doc) => (
                        <div key={doc.id} className="bg-card rounded-[12px] border border-border p-5 hover:shadow-[var(--shadow-color)_0px_4px_16px] transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="h-10 w-10 rounded-[8px] bg-accent-muted flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-accent" />
                                </div>
                                <Badge variant={kategoriColors[doc.kategori] || "default"}>{doc.kategori}</Badge>
                            </div>
                            <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{doc.nama}</h3>
                            <p className="text-xs text-muted-foreground mb-3">Klien: {doc.clientName}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.ukuran)}</span>
                                <span>{new Date(doc.tanggalUpload).toLocaleDateString("id-ID")}</span>
                            </div>
                            <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                                <button onClick={() => setPreviewDoc(doc)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-[6px] hover:bg-accent-muted text-muted-foreground hover:text-accent transition-colors">
                                    <Eye className="h-3.5 w-3.5" /> Lihat
                                </button>
                                <button onClick={() => handleDownload(doc.fileUrl)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-[6px] hover:bg-surface text-muted-foreground transition-colors">
                                    <Download className="h-3.5 w-3.5" /> Unduh
                                </button>
                                <button onClick={() => handleDelete(doc.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-[6px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Upload Dokumen Baru" size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nama Dokumen" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required placeholder="Faktur Pajak 010-23-XXXXX" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value as DocType["kategori"] })} options={kategoriOptions} />
                        {isAdmin && (
                            <Select label="Klien" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} options={clients.map((c) => ({ value: c.id, label: c.nama }))} placeholder="Pilih Klien" />
                        )}
                    </div>
                    <div
                        className="border-2 border-dashed border-border rounded-[12px] p-8 text-center cursor-pointer hover:border-accent/40 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                        />
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        {selectedFile ? (
                            <p className="text-sm text-accent font-medium">{selectedFile.name}</p>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">Klik untuk memilih file</p>
                                <p className="text-xs text-muted-foreground opacity-60 mt-1">PDF, JPG, PNG, XLSX (maks 10MB)</p>
                            </>
                        )}
                    </div>
                    <Textarea label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan..." />
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="accent">Upload Dokumen</Button>
                    </div>
                </form>
            </Modal>

            {/* Preview Modal */}
            <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title="Detail Dokumen" size="lg">
                {previewDoc && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-muted-foreground">Nama</p><p className="font-medium text-foreground">{previewDoc.nama}</p></div>
                            <div><p className="text-xs text-muted-foreground">Kategori</p><Badge variant={kategoriColors[previewDoc.kategori]}>{previewDoc.kategori}</Badge></div>
                            <div><p className="text-xs text-muted-foreground">Klien</p><p className="font-medium text-foreground">{previewDoc.clientName}</p></div>
                            <div><p className="text-xs text-muted-foreground">Ukuran</p><p className="font-medium text-foreground">{formatFileSize(previewDoc.ukuran)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Tanggal Upload</p><p className="font-medium text-foreground">{new Date(previewDoc.tanggalUpload).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div>
                        </div>
                        {previewDoc.catatan && (
                            <div><p className="text-xs text-muted-foreground mb-1">Catatan</p><p className="text-sm text-foreground">{previewDoc.catatan}</p></div>
                        )}
                        {previewDoc.fileUrl && (
                            <Button onClick={() => handleDownload(previewDoc.fileUrl)} variant="accent" className="w-full">
                                <Download className="h-4 w-4 mr-2" /> Unduh Dokumen
                            </Button>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
