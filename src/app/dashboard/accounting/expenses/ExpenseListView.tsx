"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Search, Receipt, Trash2, Download } from "lucide-react";
import { formatIDR, Client } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import {
    createExpense,
    deleteExpense,
    getExpenseAccountOptions,
    getBankAccountOptions,
} from "@/app/actions/expenses";
import { PPH_RATES } from "@/lib/tax-config";
import { exportToCsv, csvIDR, csvDate } from "@/lib/csv-export";

interface ExpenseItem {
    id: string;
    nomorBukti: string;
    tanggal: string | Date;
    deskripsi: string;
    jumlah: number;
    vendor: string | null;
    isPaid: boolean;
    metodePembayaran: string | null;
    expenseAccountCode: string;
    pphType: string | null;
    pphAmount: number | null;
    netAmount: number | null;
    catatan: string | null;
    clientId: string;
    clientName?: string;
}

interface ExpenseListViewProps {
    initialExpenses: ExpenseItem[];
    clients: Client[];
}

const pphOptions = [
    { value: "", label: "Tanpa PPh" },
    ...Object.entries(PPH_RATES).map(([key, val]) => ({
        value: key,
        label: `${val.label} (${val.rate * 100}%)`,
    })),
];

export function ExpenseListView({ initialExpenses, clients }: ExpenseListViewProps) {
    const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const { isAdmin, isLoaded: roleLoaded } = useRoles();
    const router = useRouter();
    const toast = useToast();

    // Account options
    const [expenseAccounts, setExpenseAccounts] = useState<{ code: string; name: string }[]>([]);
    const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);

    const [form, setForm] = useState({
        clientId: "",
        tanggal: new Date().toISOString().split("T")[0],
        deskripsi: "",
        jumlah: 0,
        vendor: "",
        isPaid: true,
        metodePembayaran: "Transfer",
        expenseAccountCode: "",
        bankAccountCode: "110",
        pphType: "",
        catatan: "",
    });

    // Load account options when client changes
    useEffect(() => {
        if (!form.clientId) return;
        getExpenseAccountOptions(form.clientId).then((res) => {
            if (res.success) setExpenseAccounts(res.data);
        });
        getBankAccountOptions(form.clientId).then((res) => {
            if (res.success) setBankAccounts(res.data);
        });
    }, [form.clientId]);

    const pphAmount = form.pphType && PPH_RATES[form.pphType]
        ? Math.round(form.jumlah * PPH_RATES[form.pphType].rate)
        : 0;
    const netAmount = form.jumlah - pphAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createExpense({
            clientId: form.clientId,
            tanggal: form.tanggal,
            deskripsi: form.deskripsi,
            jumlah: form.jumlah,
            vendor: form.vendor || undefined,
            isPaid: form.isPaid,
            metodePembayaran: form.metodePembayaran || undefined,
            expenseAccountCode: form.expenseAccountCode,
            bankAccountCode: form.bankAccountCode,
            pphType: form.pphType || undefined,
            catatan: form.catatan || undefined,
        });
        if (res.success) {
            router.refresh();
            setModalOpen(false);
            setForm({
                clientId: "", tanggal: new Date().toISOString().split("T")[0],
                deskripsi: "", jumlah: 0, vendor: "", isPaid: true,
                metodePembayaran: "Transfer", expenseAccountCode: "",
                bankAccountCode: "110", pphType: "", catatan: "",
            });
            toast.success("Beban berhasil dicatat");
        } else {
            toast.error(res.error || "Gagal mencatat beban");
        }
    };

    const handleDelete = async (id: string) => {
        const res = await deleteExpense(id);
        if (res.success) {
            setExpenses(expenses.filter((e) => e.id !== id));
            router.refresh();
            toast.success("Beban berhasil dihapus");
        } else {
            toast.error(res.error || "Gagal menghapus beban");
        }
    };

    const filtered = expenses.filter((e) => {
        const q = search.toLowerCase();
        return (
            e.deskripsi.toLowerCase().includes(q) ||
            e.nomorBukti.toLowerCase().includes(q) ||
            (e.vendor || "").toLowerCase().includes(q) ||
            (e.clientName || "").toLowerCase().includes(q)
        );
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.jumlah, 0);

    const inputCls = "w-full h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

    if (!roleLoaded) {
        return <div className="flex items-center justify-center py-20 animate-pulse text-muted-foreground">Memuat...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pencatatan Beban</h1>
                    <p className="text-sm text-muted-foreground mt-1">Kelola pengeluaran dan beban operasional</p>
                </div>
                <div className="flex items-center gap-2">
                    {filtered.length > 0 && (
                        <button
                            onClick={() => exportToCsv(
                                filtered,
                                [
                                    { key: "nomorBukti", label: "No. Bukti" },
                                    { key: "tanggal", label: "Tanggal", format: csvDate },
                                    { key: "deskripsi", label: "Deskripsi" },
                                    { key: "vendor", label: "Vendor" },
                                    { key: "jumlah", label: "Jumlah", format: csvIDR },
                                    { key: "pphType", label: "PPh" },
                                    { key: "pphAmount", label: "PPh Amount", format: csvIDR },
                                    { key: "netAmount", label: "Netto", format: csvIDR },
                                ],
                                "expenses"
                            )}
                            className="flex items-center justify-center h-10 px-4 rounded-[8px] border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
                        >
                            <Download className="h-4 w-4 mr-2" /> CSV
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                            <Plus className="h-4 w-4 mr-2" /> Catat Beban
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Beban</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">{formatIDR(totalExpenses)}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Jumlah Transaksi</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{expenses.length}</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Cari beban..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className={`${inputCls} pl-10 h-10`} />
                </div>
            </div>

            {/* Expense Table */}
            <div className="bg-card rounded-[12px] border border-border shadow-[var(--shadow-color)_0px_2px_8px_0px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">No. Bukti</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Tanggal</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Deskripsi</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Vendor</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">PPh</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Jumlah</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                                {isAdmin && <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>Tidak ada beban ditemukan</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-surface/60 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{exp.nomorBukti}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{new Date(exp.tanggal).toLocaleDateString("id-ID")}</td>
                                        <td className="px-4 py-3 text-foreground">{exp.deskripsi}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{exp.vendor || "—"}</td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            {exp.pphType ? (
                                                <Badge variant="warning">{exp.pphType} ({formatIDR(exp.pphAmount || 0)})</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatIDR(exp.jumlah)}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={exp.isPaid ? "success" : "warning"}>
                                                {exp.isPaid ? "Lunas" : "Hutang"}
                                            </Badge>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleDelete(exp.id)} className="p-2 rounded-[8px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Expense Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Catat Beban Baru" size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Klien" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, expenseAccountCode: "" })} options={clients.map((c) => ({ value: c.id, label: c.nama }))} placeholder="Pilih Klien" />
                        <Input label="Tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
                    </div>

                    <Input label="Deskripsi" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} required placeholder="Pembayaran sewa kantor, dll." />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Jumlah (Rp)" type="number" value={form.jumlah || ""} onChange={(e) => setForm({ ...form, jumlah: parseFloat(e.target.value) || 0 })} required min={1} />
                        <Input label="Vendor/Supplier" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Nama vendor (opsional)" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Akun Beban"
                            value={form.expenseAccountCode}
                            onChange={(e) => setForm({ ...form, expenseAccountCode: e.target.value })}
                            options={expenseAccounts.map((a) => ({ value: a.code, label: `${a.code} - ${a.name}` }))}
                            placeholder={form.clientId ? "Pilih akun beban" : "Pilih klien dulu"}
                        />
                        <Select
                            label="Pemotongan PPh"
                            value={form.pphType}
                            onChange={(e) => setForm({ ...form, pphType: e.target.value })}
                            options={pphOptions}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Status Pembayaran"
                            value={form.isPaid ? "true" : "false"}
                            onChange={(e) => setForm({ ...form, isPaid: e.target.value === "true" })}
                            options={[
                                { value: "true", label: "Sudah Dibayar (Kas/Bank)" },
                                { value: "false", label: "Belum Dibayar (Hutang)" },
                            ]}
                        />
                        {form.isPaid && (
                            <>
                                <Select
                                    label="Metode Pembayaran"
                                    value={form.metodePembayaran}
                                    onChange={(e) => setForm({ ...form, metodePembayaran: e.target.value })}
                                    options={[
                                        { value: "Transfer", label: "Transfer Bank" },
                                        { value: "Cash", label: "Tunai" },
                                        { value: "Giro", label: "Giro" },
                                    ]}
                                />
                                <Select
                                    label="Akun Kas/Bank"
                                    value={form.bankAccountCode}
                                    onChange={(e) => setForm({ ...form, bankAccountCode: e.target.value })}
                                    options={bankAccounts.map((a) => ({ value: a.code, label: `${a.code} - ${a.name}` }))}
                                />
                            </>
                        )}
                    </div>

                    {/* Summary */}
                    {form.jumlah > 0 && (
                        <div className="bg-surface rounded-[10px] p-4 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Jumlah Bruto</span><span className="font-medium text-foreground">{formatIDR(form.jumlah)}</span></div>
                            {pphAmount > 0 && (
                                <div className="flex justify-between"><span className="text-muted-foreground">PPh Dipotong</span><span className="font-medium text-red-500">- {formatIDR(pphAmount)}</span></div>
                            )}
                            <div className="flex justify-between border-t border-border pt-1"><span className="font-medium text-foreground">{form.isPaid ? "Dibayarkan" : "Hutang"}</span><span className="font-bold text-foreground">{formatIDR(netAmount)}</span></div>
                        </div>
                    )}

                    <Textarea label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan..." />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="accent">Simpan Beban</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
