"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Plus, Trash2, ArrowLeft, RefreshCw, Pause, Play, CalendarClock } from "lucide-react";
import { formatIDR } from "@/lib/data";
import {
    createRecurringInvoice,
    updateRecurringInvoiceStatus,
    deleteRecurringInvoice,
} from "@/app/actions/recurring-invoices";
import { useRouter } from "next/navigation";

interface RecurringItem {
    id?: string;
    deskripsi: string;
    qty: number;
    harga: number;
    jumlah: number;
}

interface RecurringInvoice {
    id: string;
    interval: "Monthly" | "Quarterly" | "Yearly";
    nextRunDate: string;
    isActive: boolean;
    catatan: string | null;
    createdAt: string;
    client: { id: string; nama: string } | null;
    items: RecurringItem[];
}

interface Props {
    initialRecurring: RecurringInvoice[];
    clients: { id: string; nama: string }[];
}

const intervalLabels: Record<string, string> = {
    Monthly: "Bulanan",
    Quarterly: "Triwulan",
    Yearly: "Tahunan",
};

const intervalBadge: Record<string, "info" | "warning" | "default"> = {
    Monthly: "info",
    Quarterly: "warning",
    Yearly: "default",
};

export function RecurringInvoiceView({ initialRecurring, clients }: Props) {
    const [recurring, setRecurring] = useState<RecurringInvoice[]>(initialRecurring);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const router = useRouter();
    const toast = useToast();

    const [form, setForm] = useState({
        clientId: "",
        interval: "Monthly" as "Monthly" | "Quarterly" | "Yearly",
        catatan: "",
        items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] as RecurringItem[],
    });

    const addItem = () => setForm({ ...form, items: [...form.items, { deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] });
    const removeItem = (index: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });

    const updateItem = (index: number, field: keyof RecurringItem, value: string | number) => {
        const updated = [...form.items];
        if (field === "deskripsi") {
            updated[index].deskripsi = value as string;
        } else {
            const numVal = typeof value === "string" ? parseFloat(value.replace(/[^0-9]/g, "")) || 0 : value;
            (updated[index] as never as Record<string, number>)[field as string] = numVal;
            updated[index].jumlah = updated[index].qty * updated[index].harga;
        }
        setForm({ ...form, items: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientId) {
            toast.error("Pilih klien terlebih dahulu");
            return;
        }
        if (form.items.some(i => !i.deskripsi || i.harga <= 0)) {
            toast.error("Lengkapi semua item layanan");
            return;
        }

        const res = await createRecurringInvoice({
            clientId: form.clientId,
            interval: form.interval,
            catatan: form.catatan,
            items: form.items.map(item => ({
                deskripsi: item.deskripsi,
                qty: item.qty,
                harga: item.harga,
                jumlah: item.qty * item.harga,
            })),
        });

        if (res.success) {
            toast.success("Invoice berulang berhasil dibuat");
            setModalOpen(false);
            setForm({ clientId: "", interval: "Monthly", catatan: "", items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] });
            router.refresh();
        } else {
            toast.error(res.error || "Gagal membuat invoice berulang");
        }
    };

    const handleToggleStatus = async (id: string, currentActive: boolean) => {
        const res = await updateRecurringInvoiceStatus(id, !currentActive);
        if (res.success) {
            setRecurring(recurring.map(r => r.id === id ? { ...r, isActive: !currentActive } : r));
            toast.success(currentActive ? "Invoice berulang dijeda" : "Invoice berulang diaktifkan");
        } else {
            toast.error(res.error || "Gagal mengubah status");
        }
    };

    const handleDelete = async (id: string) => {
        const res = await deleteRecurringInvoice(id);
        if (res.success) {
            setRecurring(recurring.filter(r => r.id !== id));
            toast.success("Invoice berulang berhasil dihapus");
        } else {
            toast.error(res.error || "Gagal menghapus");
        }
        setDeleteConfirm(null);
    };

    const subtotal = form.items.reduce((s, i) => s + i.qty * i.harga, 0);
    const inputCls = "w-full h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Kembali ke Invoice
                    </Link>
                    <h1 className="text-2xl font-bold text-foreground">Invoice Berulang</h1>
                    <p className="text-sm text-muted-foreground mt-1">Kelola template invoice otomatis untuk tagihan rutin</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                    <Plus className="h-4 w-4 mr-2" /> Buat Template
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Template</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{recurring.length}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Aktif</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">{recurring.filter(r => r.isActive).length}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Dijeda</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1">{recurring.filter(r => !r.isActive).length}</p>
                </div>
            </div>

            {/* List */}
            {recurring.length === 0 ? (
                <div className="bg-card rounded-[12px] border border-border p-12 text-center">
                    <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Belum ada template invoice berulang</p>
                    <p className="text-sm text-muted-foreground mt-1">Buat template untuk mengirim invoice otomatis secara berkala</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {recurring.map((r) => {
                        const total = r.items.reduce((s, i) => s + i.qty * i.harga, 0);
                        const totalWithPpn = Math.round(total * 1.11);
                        return (
                            <div key={r.id} className={`bg-card rounded-[12px] border border-border p-5 transition-colors ${!r.isActive ? "opacity-60" : ""}`}>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <h3 className="font-semibold text-foreground">{r.client?.nama || "Klien tidak ditemukan"}</h3>
                                            <Badge variant={intervalBadge[r.interval]}>{intervalLabels[r.interval]}</Badge>
                                            <Badge variant={r.isActive ? "success" : "default"}>{r.isActive ? "Aktif" : "Dijeda"}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                            <span>Tagihan berikutnya: <span className="font-medium text-foreground">{new Date(r.nextRunDate).toLocaleDateString("id-ID")}</span></span>
                                            <span>Total: <span className="font-medium text-foreground">{formatIDR(totalWithPpn)}</span></span>
                                            <span>{r.items.length} item</span>
                                        </div>
                                        {r.catatan && <p className="text-sm text-muted-foreground mt-2">{r.catatan}</p>}

                                        {/* Items preview */}
                                        <div className="mt-3 space-y-1">
                                            {r.items.map((item, i) => (
                                                <div key={i} className="text-xs text-muted-foreground flex justify-between max-w-md">
                                                    <span>{item.deskripsi} (x{item.qty})</span>
                                                    <span className="font-medium">{formatIDR(item.qty * item.harga)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleToggleStatus(r.id, r.isActive)}
                                            className={`p-2 rounded-[8px] transition-colors ${r.isActive ? "hover:bg-amber-500/10 text-amber-500" : "hover:bg-emerald-500/10 text-emerald-500"}`}
                                            title={r.isActive ? "Jeda" : "Aktifkan"}
                                        >
                                            {r.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(r.id)}
                                            className="p-2 rounded-[8px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Buat Invoice Berulang" size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Klien"
                            value={form.clientId}
                            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                            options={clients.map(c => ({ value: c.id, label: c.nama }))}
                            placeholder="Pilih Klien"
                        />
                        <Select
                            label="Interval"
                            value={form.interval}
                            onChange={(e) => setForm({ ...form, interval: e.target.value as typeof form.interval })}
                            options={[
                                { value: "Monthly", label: "Bulanan" },
                                { value: "Quarterly", label: "Triwulan" },
                                { value: "Yearly", label: "Tahunan" },
                            ]}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground">Item Layanan</label>
                            <Button type="button" variant="soft" size="default" onClick={addItem}>
                                <Plus className="h-3 w-3 mr-1" /> Tambah Item
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {form.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-5">
                                        <input type="text" placeholder="Deskripsi layanan" value={item.deskripsi} onChange={(e) => updateItem(index, "deskripsi", e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(index, "qty", e.target.value)} min={1} className={inputCls} />
                                    </div>
                                    <div className="col-span-3">
                                        <input type="text" placeholder="Harga" value={item.harga || ""} onChange={(e) => updateItem(index, "harga", e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground truncate">{formatIDR(item.qty * item.harga)}</span>
                                        {form.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(index)} className="p-1 hover:bg-error-muted rounded-[6px] text-muted-foreground hover:text-error">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border text-right space-y-1">
                            <p className="text-sm text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatIDR(subtotal)}</span></p>
                            <p className="text-sm text-muted-foreground">PPN 11%: <span className="font-medium text-foreground">{formatIDR(Math.round(subtotal * 0.11))}</span></p>
                            <p className="text-base font-bold text-foreground">Total per Periode: {formatIDR(Math.round(subtotal * 1.11))}</p>
                        </div>
                    </div>

                    <Textarea label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan..." />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="accent">
                            <RefreshCw className="h-4 w-4 mr-1" /> Buat Template
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus Invoice Berulang" size="sm">
                <p className="text-sm text-muted-foreground mb-6">
                    Apakah Anda yakin ingin menghapus template invoice berulang ini? Invoice yang sudah digenerate tidak akan terpengaruh.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="soft" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                    <Button variant="accent" className="bg-error hover:bg-error/90" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
                </div>
            </Modal>
        </div>
    );
}
