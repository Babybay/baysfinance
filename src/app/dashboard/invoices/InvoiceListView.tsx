"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Search, Receipt, Eye, Trash2, Printer, Download, RefreshCw, CreditCard, X } from "lucide-react";
import { exportToCsv, csvIDR, csvDate } from "@/lib/csv-export";
import { Invoice, InvoiceItem, Client, PaymentRecord, formatIDR } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";
import { useToast } from "@/components/ui/Toast";
import { createInvoice, updateInvoiceStatus } from "@/app/actions/invoices";
import { recordPayment, getPaymentsByInvoice, deletePayment } from "@/app/actions/payments";
import { InvoiceStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

const statusColors: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
    [InvoiceStatus.Draft]: "default",
    [InvoiceStatus.Terkirim]: "info",
    [InvoiceStatus.Lunas]: "success",
    [InvoiceStatus.JatuhTempo]: "danger",
};

interface InvoiceListViewProps {
    initialInvoices: Invoice[];
    clients: Client[];
}

export function InvoiceListView({ initialInvoices, clients }: InvoiceListViewProps) {
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [modalOpen, setModalOpen] = useState(false);
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
    const { isAdmin, isLoaded: roleLoaded } = useRoles();
    const router = useRouter();
    const toast = useToast();

    // Payment state
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [totalPaid, setTotalPaid] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        jumlah: 0,
        tanggalBayar: new Date().toISOString().split("T")[0],
        metodePembayaran: "Transfer",
        catatan: "",
    });

    const [form, setForm] = useState({
        clientId: "",
        jatuhTempo: "",
        catatan: "",
        namaBank: "Bank BCA",
        nomorRekening: "",
        atasNama: "Bay'sConsult",
        penandaTangan: "",
        jabatanPenandaTangan: "Managing Partner",
        items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] as InvoiceItem[],
    });

    const addItem = () => setForm({ ...form, items: [...form.items, { deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] });
    const removeItem = (index: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
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
        const res = await createInvoice({
            clientId: form.clientId,
            jatuhTempo: form.jatuhTempo,
            catatan: form.catatan,
            namaBank: form.namaBank,
            nomorRekening: form.nomorRekening,
            atasNama: form.atasNama,
            penandaTangan: form.penandaTangan,
            jabatanPenandaTangan: form.jabatanPenandaTangan,
            items: form.items.map(item => ({
                deskripsi: item.deskripsi,
                qty: item.qty,
                harga: item.harga,
                jumlah: item.qty * item.harga,
            })),
        });
        if (res.success) {
            router.refresh();
            setModalOpen(false);
            setForm({ clientId: "", jatuhTempo: "", catatan: "", namaBank: "Bank BCA", nomorRekening: "", atasNama: "Bay'sConsult", penandaTangan: "", jabatanPenandaTangan: "Managing Partner", items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] });
            toast.success("Invoice berhasil dibuat");
        } else {
            toast.error(res.error || "Gagal membuat invoice");
        }
    };

    const handleUpdateStatus = async (id: string, status: Invoice["status"]) => {
        const res = await updateInvoiceStatus(id, status);
        if (res.success) {
            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
            if (viewInvoice?.id === id) setViewInvoice({ ...viewInvoice, status });
            router.refresh();
            toast.success("Status invoice berhasil diperbarui");
        } else {
            toast.error(res.error || "Gagal mengubah status invoice");
        }
    };

    const openPaymentModal = async (inv: Invoice) => {
        setPaymentInvoice(inv);
        setPaymentModalOpen(true);
        setLoadingPayments(true);
        setPaymentForm({ jumlah: 0, tanggalBayar: new Date().toISOString().split("T")[0], metodePembayaran: "Transfer", catatan: "" });
        const res = await getPaymentsByInvoice(inv.id);
        if (res.success) {
            setPayments(res.data as PaymentRecord[]);
            setTotalPaid(res.totalPaid);
            setRemaining(res.remaining);
            setPaymentForm(f => ({ ...f, jumlah: res.remaining }));
        }
        setLoadingPayments(false);
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentInvoice) return;
        const res = await recordPayment({
            invoiceId: paymentInvoice.id,
            jumlah: paymentForm.jumlah,
            tanggalBayar: paymentForm.tanggalBayar,
            metodePembayaran: paymentForm.metodePembayaran,
            catatan: paymentForm.catatan || undefined,
        });
        if (res.success) {
            toast.success(res.data?.autoLunas ? "Pembayaran dicatat — Invoice lunas!" : "Pembayaran berhasil dicatat");
            if (res.data?.autoLunas) {
                setInvoices(invoices.map(inv => inv.id === paymentInvoice.id ? { ...inv, status: InvoiceStatus.Lunas } : inv));
                if (viewInvoice?.id === paymentInvoice.id) setViewInvoice({ ...viewInvoice, status: InvoiceStatus.Lunas });
            }
            // Refresh payment list
            await openPaymentModal(paymentInvoice);
            router.refresh();
        } else {
            toast.error(res.error || "Gagal mencatat pembayaran");
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!paymentInvoice) return;
        const res = await deletePayment(paymentId);
        if (res.success) {
            toast.success("Pembayaran dihapus");
            await openPaymentModal(paymentInvoice);
            router.refresh();
        } else {
            toast.error(res.error || "Gagal menghapus pembayaran");
        }
    };

    const filtered = invoices.filter((inv) => {
        const matchSearch = inv.nomorInvoice.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "Semua" || inv.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        totalPendapatan: invoices.filter((i) => i.status === InvoiceStatus.Lunas).reduce((sum, i) => sum + Number(i.total), 0),
        belumBayar: invoices.filter((i) => i.status === InvoiceStatus.Terkirim || i.status === InvoiceStatus.JatuhTempo).reduce((sum, i) => sum + Number(i.total), 0),
        jumlahInvoice: invoices.length,
    };

    const inputCls = "w-full h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

    if (!roleLoaded) {
        return <div className="flex items-center justify-center py-20 animate-pulse text-muted-foreground">Memuat...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Invoice &amp; Billing</h1>
                    <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Kelola invoice konsultasi pajak" : "Daftar tagihan Anda"}</p>
                </div>
                <div className="flex items-center gap-2">
                    {filtered.length > 0 && (
                        <button
                            onClick={() => exportToCsv(
                                filtered,
                                [
                                    { key: "nomorInvoice", label: "No. Invoice" },
                                    { key: "clientName", label: "Klien" },
                                    { key: "tanggal", label: "Tanggal", format: csvDate },
                                    { key: "jatuhTempo", label: "Jatuh Tempo", format: csvDate },
                                    { key: "subtotal", label: "Subtotal", format: csvIDR },
                                    { key: "ppn", label: "PPN", format: csvIDR },
                                    { key: "total", label: "Total", format: csvIDR },
                                    { key: "status", label: "Status" },
                                ],
                                "invoices"
                            )}
                            className="flex items-center justify-center h-10 px-4 rounded-[8px] border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
                        >
                            <Download className="h-4 w-4 mr-2" /> CSV
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <a href="/dashboard/invoices/recurring" className="flex items-center justify-center h-10 px-4 rounded-[8px] border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors">
                                <RefreshCw className="h-4 w-4 mr-2" /> Berulang
                            </a>
                            <button onClick={() => setModalOpen(true)} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                                <Plus className="h-4 w-4 mr-2" /> Buat Invoice
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Pendapatan (Lunas)</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">{formatIDR(stats.totalPendapatan)}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Belum Dibayar</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1">{formatIDR(stats.belumBayar)}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Invoice</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.jumlahInvoice}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Cari nomor invoice atau klien..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className={`${inputCls} pl-10 h-10`} />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="Semua">Semua Status</option>
                    <option value={InvoiceStatus.Draft}>Draft</option>
                    <option value={InvoiceStatus.Terkirim}>Terkirim</option>
                    <option value={InvoiceStatus.Lunas}>Lunas</option>
                    <option value={InvoiceStatus.JatuhTempo}>Jatuh Tempo</option>
                </select>
            </div>

            {/* Invoice Table */}
            <div className="bg-card rounded-[12px] border border-border shadow-[var(--shadow-color)_0px_2px_8px_0px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">No. Invoice</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Klien</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Tanggal</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Jatuh Tempo</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Total</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>Tidak ada invoice ditemukan</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-surface/60 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{inv.nomorInvoice}</td>
                                        <td className="px-4 py-3 text-foreground">{inv.clientName}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(inv.tanggal).toLocaleDateString("id-ID")}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(inv.jatuhTempo).toLocaleDateString("id-ID")}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatIDR(inv.total)}</td>
                                        <td className="px-4 py-3"><Badge variant={statusColors[inv.status]}>{inv.status}</Badge></td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setViewInvoice(inv)} className="p-2 rounded-[8px] hover:bg-accent-muted text-muted-foreground hover:text-accent transition-colors">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Invoice Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Buat Invoice Baru" size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Klien" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} options={clients.map((c) => ({ value: c.id, label: c.nama }))} placeholder="Pilih Klien" />
                        <Input label="Jatuh Tempo" type="date" value={form.jatuhTempo} onChange={(e) => setForm({ ...form, jatuhTempo: e.target.value })} required />
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
                            <p className="text-sm text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatIDR(form.items.reduce((s, i) => s + i.qty * i.harga, 0))}</span></p>
                            <p className="text-sm text-muted-foreground">PPN 11%: <span className="font-medium text-foreground">{formatIDR(Math.round(form.items.reduce((s, i) => s + i.qty * i.harga, 0) * 0.11))}</span></p>
                            <p className="text-base font-bold text-foreground">Total: {formatIDR(Math.round(form.items.reduce((s, i) => s + i.qty * i.harga, 0) * 1.11))}</p>
                        </div>
                    </div>

                    <Textarea label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan..." />

                    {/* Bank Account / Payment Destination */}
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Tujuan Pembayaran</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input label="Nama Bank" value={form.namaBank} onChange={(e) => setForm({ ...form, namaBank: e.target.value })} placeholder="Bank BCA" />
                            <Input label="No. Rekening" value={form.nomorRekening} onChange={(e) => setForm({ ...form, nomorRekening: e.target.value })} placeholder="123-456-7890" />
                            <Input label="Atas Nama" value={form.atasNama} onChange={(e) => setForm({ ...form, atasNama: e.target.value })} placeholder="Bay'sConsult" />
                        </div>
                    </div>

                    {/* Signer / Penanda Tangan */}
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Penanda Tangan</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="Nama Lengkap" value={form.penandaTangan} onChange={(e) => setForm({ ...form, penandaTangan: e.target.value })} placeholder="Nama penanda tangan" />
                            <Input label="Jabatan" value={form.jabatanPenandaTangan} onChange={(e) => setForm({ ...form, jabatanPenandaTangan: e.target.value })} placeholder="Managing Partner" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="accent">Buat Invoice</Button>
                    </div>
                </form>
            </Modal>

            {/* View Invoice Modal */}
            <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.nomorInvoice || ""}`} size="lg">
                {viewInvoice && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-xs text-muted-foreground">Klien</p><p className="font-medium text-sm text-foreground">{viewInvoice.clientName}</p></div>
                            <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="font-medium text-sm text-foreground">{new Date(viewInvoice.tanggal).toLocaleDateString("id-ID")}</p></div>
                            <div><p className="text-xs text-muted-foreground">Jatuh Tempo</p><p className="font-medium text-sm text-foreground">{new Date(viewInvoice.jatuhTempo).toLocaleDateString("id-ID")}</p></div>
                            <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={statusColors[viewInvoice.status]}>{viewInvoice.status}</Badge></div>
                        </div>

                        <div className="overflow-x-auto rounded-[8px] border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-surface">
                                        <th className="text-left px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Deskripsi</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Qty</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Harga</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {viewInvoice.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 text-foreground">{item.deskripsi}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{item.qty}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{formatIDR(item.harga)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-foreground">{formatIDR(item.jumlah)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="text-right space-y-1 pt-2">
                            <p className="text-sm text-muted-foreground">Subtotal: {formatIDR(viewInvoice.subtotal)}</p>
                            <p className="text-sm text-muted-foreground">PPN 11%: {formatIDR(viewInvoice.ppn)}</p>
                            <p className="text-lg font-bold text-foreground">Total: {formatIDR(viewInvoice.total)}</p>
                        </div>

                        {viewInvoice.catatan && (
                            <div><p className="text-xs text-muted-foreground mb-1">Catatan</p><p className="text-sm text-foreground">{viewInvoice.catatan}</p></div>
                        )}

                        {(viewInvoice.namaBank || viewInvoice.nomorRekening || viewInvoice.atasNama) && (
                            <div className="bg-surface rounded-[8px] p-3">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Tujuan Pembayaran</p>
                                <p className="text-sm text-foreground">{viewInvoice.namaBank}</p>
                                {viewInvoice.nomorRekening && <p className="text-sm text-foreground">No. Rek: {viewInvoice.nomorRekening}</p>}
                                {viewInvoice.atasNama && <p className="text-sm text-foreground">a.n. {viewInvoice.atasNama}</p>}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                            {isAdmin && (
                                <>
                                    {(viewInvoice.status === InvoiceStatus.Terkirim || viewInvoice.status === InvoiceStatus.JatuhTempo) && (
                                        <Button size="default" variant="accent" onClick={() => openPaymentModal(viewInvoice)}>
                                            <CreditCard className="h-4 w-4 mr-1" /> Catat Pembayaran
                                        </Button>
                                    )}
                                    <Button size="default" variant="soft" onClick={() => handleUpdateStatus(viewInvoice.id, InvoiceStatus.Lunas)}>Tandai Lunas</Button>
                                    <Button size="default" variant="soft" onClick={() => handleUpdateStatus(viewInvoice.id, InvoiceStatus.Terkirim)}>Tandai Terkirim</Button>
                                </>
                            )}
                            <Button size="default" variant="transparent" onClick={() => window.open(`/dashboard/invoices/print/${viewInvoice.id}`, '_blank')}><Printer className="h-4 w-4 mr-1" /> Cetak</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Pembayaran — ${paymentInvoice?.nomorInvoice || ""}`} size="lg">
                {paymentInvoice && (
                    <div className="space-y-5">
                        {/* Payment Summary */}
                        <div className="bg-surface rounded-[10px] p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total Invoice</span>
                                <span className="font-semibold text-foreground">{formatIDR(paymentInvoice.total)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Sudah Dibayar</span>
                                <span className="font-semibold text-emerald-500">{formatIDR(totalPaid)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Sisa Tagihan</span>
                                <span className="font-semibold text-amber-500">{formatIDR(remaining)}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${paymentInvoice.total > 0 ? Math.min(100, (totalPaid / paymentInvoice.total) * 100) : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                                {paymentInvoice.total > 0 ? Math.round((totalPaid / paymentInvoice.total) * 100) : 0}% terbayar
                            </p>
                        </div>

                        {/* Payment Form (only if there's remaining balance) */}
                        {remaining > 0 && (
                            <form onSubmit={handleRecordPayment} className="space-y-3 border border-border rounded-[10px] p-4">
                                <h3 className="text-sm font-semibold text-foreground">Catat Pembayaran Baru</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                        label="Jumlah (Rp)"
                                        type="number"
                                        value={paymentForm.jumlah || ""}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, jumlah: parseFloat(e.target.value) || 0 })}
                                        required
                                        min={1}
                                        max={remaining}
                                    />
                                    <Input
                                        label="Tanggal Bayar"
                                        type="date"
                                        value={paymentForm.tanggalBayar}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, tanggalBayar: e.target.value })}
                                        required
                                    />
                                    <Select
                                        label="Metode Pembayaran"
                                        value={paymentForm.metodePembayaran}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, metodePembayaran: e.target.value })}
                                        options={[
                                            { value: "Transfer", label: "Transfer Bank" },
                                            { value: "Cash", label: "Tunai" },
                                            { value: "Giro", label: "Giro" },
                                        ]}
                                    />
                                    <Input
                                        label="Catatan (opsional)"
                                        type="text"
                                        value={paymentForm.catatan}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, catatan: e.target.value })}
                                        placeholder="Nomor referensi, dll."
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" variant="accent" size="default">
                                        <CreditCard className="h-4 w-4 mr-1" /> Simpan Pembayaran
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Payment History */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2">Riwayat Pembayaran</h3>
                            {loadingPayments ? (
                                <div className="text-center py-6 text-muted-foreground animate-pulse">Memuat...</div>
                            ) : payments.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">Belum ada pembayaran tercatat.</div>
                            ) : (
                                <div className="overflow-x-auto rounded-[8px] border border-border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-surface">
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Tanggal</th>
                                                <th className="text-right px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Jumlah</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Metode</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Catatan</th>
                                                {isAdmin && <th className="text-right px-3 py-2 text-muted-foreground font-medium text-[11px] uppercase">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="px-3 py-2 text-foreground">{new Date(p.tanggalBayar).toLocaleDateString("id-ID")}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-emerald-500">{formatIDR(p.jumlah)}</td>
                                                    <td className="px-3 py-2 text-muted-foreground">{p.metodePembayaran}</td>
                                                    <td className="px-3 py-2 text-muted-foreground text-xs">{p.catatan || "—"}</td>
                                                    {isAdmin && (
                                                        <td className="px-3 py-2 text-right">
                                                            <button onClick={() => handleDeletePayment(p.id)} className="p-1 rounded-[6px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
