"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Search, Receipt, Eye, Trash2, Printer } from "lucide-react";
import { Invoice, InvoiceItem, Client, formatIDR } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";
import { getInvoices, createInvoice, updateInvoiceStatus } from "@/app/actions/invoices";
import { getClients } from "@/app/actions/clients";

const statusColors: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
    Draft: "default",
    Terkirim: "info",
    Lunas: "success",
    "Jatuh Tempo": "danger",
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [modalOpen, setModalOpen] = useState(false);
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
    const { role, clientId, isAdmin, isLoaded: roleLoaded } = useRoles();
    const [isLoaded, setIsLoaded] = useState(false);

    const [form, setForm] = useState({
        clientId: "",
        jatuhTempo: "",
        catatan: "",
        items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] as InvoiceItem[],
    });

    useEffect(() => {
        if (!roleLoaded) return;
        loadData();
    }, [roleLoaded, role, clientId]);

    const loadData = async () => {
        setIsLoaded(false);
        const currentClientId = role === "client" ? clientId : undefined;

        const [invRes, clientsRes] = await Promise.all([
            getInvoices(currentClientId ?? undefined),
            getClients(),
        ]);

        if (invRes.success && invRes.data) {
            const formatted = (invRes.data as any[]).map(i => ({
                ...i,
                tanggal: new Date(i.tanggal).toISOString().split("T")[0],
                jatuhTempo: new Date(i.jatuhTempo).toISOString().split("T")[0],
                status: i.status as Invoice["status"],
                items: i.items || [],
                catatan: i.catatan || "",
            }));
            setInvoices(formatted);
        }

        if (clientsRes.success && clientsRes.data) {
            const formatted = (clientsRes.data as any[]).map(c => ({
                ...c,
                jenisWP: c.jenisWP as "Orang Pribadi" | "Badan",
                status: c.status as "Aktif" | "Tidak Aktif",
                createdAt: new Date(c.createdAt).toISOString().split("T")[0],
            }));
            setClients(formatted);
        }

        setIsLoaded(true);
    };

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
            items: form.items.map(item => ({
                deskripsi: item.deskripsi,
                qty: item.qty,
                harga: item.harga,
                jumlah: item.qty * item.harga,
            })),
        });
        if (res.success) {
            await loadData();
            setModalOpen(false);
            setForm({ clientId: "", jatuhTempo: "", catatan: "", items: [{ deskripsi: "", qty: 1, harga: 0, jumlah: 0 }] });
        }
    };

    const handleUpdateStatus = async (id: string, status: Invoice["status"]) => {
        const res = await updateInvoiceStatus(id, status);
        if (res.success) {
            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
            if (viewInvoice?.id === id) setViewInvoice({ ...viewInvoice, status });
        }
    };

    const filtered = invoices.filter((inv) => {
        const matchSearch = inv.nomorInvoice.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "Semua" || inv.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        totalPendapatan: invoices.filter((i) => i.status === "Lunas").reduce((sum, i) => sum + i.total, 0),
        belumBayar: invoices.filter((i) => i.status === "Terkirim" || i.status === "Jatuh Tempo").reduce((sum, i) => sum + i.total, 0),
        jumlahInvoice: invoices.length,
    };

    const inputCls = "w-full h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Invoice &amp; Billing</h1>
                    <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Kelola invoice konsultasi pajak" : "Daftar tagihan Anda"}</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setModalOpen(true)} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                        <Plus className="h-4 w-4 mr-2" /> Buat Invoice
                    </button>
                )}
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
                    <option value="Draft">Draft</option>
                    <option value="Terkirim">Terkirim</option>
                    <option value="Lunas">Lunas</option>
                    <option value="Jatuh Tempo">Jatuh Tempo</option>
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
                            {!isLoaded ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
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

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                            {isAdmin && (
                                <>
                                    <Button size="default" variant={viewInvoice.status === "Lunas" ? "soft" : "accent"} onClick={() => handleUpdateStatus(viewInvoice.id, "Lunas")}>Tandai Lunas</Button>
                                    <Button size="default" variant="soft" onClick={() => handleUpdateStatus(viewInvoice.id, "Terkirim")}>Tandai Terkirim</Button>
                                </>
                            )}
                            <Button size="default" variant="transparent"><Printer className="h-4 w-4 mr-1" /> Cetak</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
