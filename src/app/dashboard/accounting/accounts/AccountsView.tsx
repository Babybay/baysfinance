"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Search, Wallet, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Account, formatIDR } from "@/lib/data";
import { seedAccounts } from "@/app/actions/seed-accounts";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounting";
import { useRouter } from "next/navigation";
import { AccountType } from "@prisma/client";

interface AccountsViewProps {
    accounts: Account[];
}

export function AccountsView({ accounts }: AccountsViewProps) {
    const [search, setSearch] = useState("");
    const [isSeeding, setIsSeeding] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        type: "Asset" as AccountType,
        isActive: true
    });
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleSeed = async (force: boolean = false) => {
        if (force && !confirm("Ini akan menghapus seluruh data akun default (yang belum dikaitkan dengan transaksi). Yakin ingin melanjutkan?")) return;

        setIsSeeding(true);
        const res = await seedAccounts(undefined, force);
        setIsSeeding(false);
        if (res?.success) router.refresh();
        else alert(res?.error || "Gagal menyemai akun");
    };

    const handleDelete = async (id: string, code: string, name: string) => {
        if (!confirm(`Hapus akun ${code} - ${name}?`)) return;
        const res = await deleteAccount(id);
        if (res.success) router.refresh();
        else alert(res.error);
    };

    const openCreateModal = () => {
        setEditingAccount(null);
        setFormData({ code: "", name: "", type: "Asset", isActive: true });
        setModalOpen(true);
    };

    const openEditModal = (account: Account) => {
        setEditingAccount(account);
        setFormData({
            code: account.code,
            name: account.name,
            type: account.type as AccountType,
            isActive: account.isActive
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        let res;
        if (editingAccount) {
            res = await updateAccount(editingAccount.id, formData);
        } else {
            res = await createAccount(formData);
        }

        setIsSaving(false);
        if (res.success) {
            setModalOpen(false);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    return (
        <div className="space-y-4 relative">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                        placeholder="Cari nama atau kode akun..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-background/50 border-border focus:border-accent/50 transition-all rounded-xl"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="soft" onClick={() => handleSeed(true)} disabled={isSeeding} className="gap-2 rounded-xl text-danger hover:bg-danger/10">
                        <RotateCcw className={`h-4 w-4 ${isSeeding ? 'animate-spin' : ''}`} />
                        Reset & Re-Seed
                    </Button>
                    <Button onClick={openCreateModal} className="gap-2 rounded-xl shadow-sm">
                        Tambah Akun
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Kode</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Nama Akun</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Tipe</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-right">Saldo Terkini</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-center">Status</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-right w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Wallet className="h-10 w-10 text-muted-foreground/30" />
                                        <p className="text-muted-foreground">Belum ada chart of accounts.</p>
                                        <Button variant="secondary" onClick={() => handleSeed(false)} disabled={isSeeding} className="mt-2">
                                            {isSeeding ? "Memproses..." : "Seed Default CoA"}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((account) => (
                                <tr key={account.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="p-4 font-mono text-accent">{account.code}</td>
                                    <td className="p-4 font-medium">{account.name}</td>
                                    <td className="p-4">
                                        <Badge variant="neutral" className="text-[10px] font-bold uppercase tracking-tighter">
                                            {account.type}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right font-semibold">{formatIDR(account.balance || 0)}</td>
                                    <td className="p-4 text-center">
                                        {account.isActive ? (
                                            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="transparent" size="icon" onClick={() => openEditModal(account)} className="h-8 w-8 text-muted-foreground hover:text-accent">
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="transparent" size="icon" onClick={() => handleDelete(account.id, account.code, account.name)} className="h-8 w-8 text-muted-foreground hover:text-danger">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="font-serif text-xl">{editingAccount ? "Edit Akun" : "Tambah Akun"}</h3>
                            <Button variant="transparent" size="icon" onClick={() => setModalOpen(false)}>
                                <XCircle className="h-5 w-5 opacity-50" />
                            </Button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Kode Akun</label>
                                <Input
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Contoh: 1101"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Nama Akun</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Kas Kecil"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tipe Akun</label>
                                <select
                                    className="w-full h-10 px-3 py-2 rounded-xl border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                                >
                                    <option value="Asset">Aset (Asset)</option>
                                    <option value="Liability">Kewajiban (Liability)</option>
                                    <option value="Equity">Ekuitas (Equity)</option>
                                    <option value="Revenue">Pendapatan (Revenue)</option>
                                    <option value="Expense">Beban (Expense)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-sm font-medium">Akun Aktif</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
