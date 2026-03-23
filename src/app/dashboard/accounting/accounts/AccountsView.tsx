"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Search, Wallet, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Account, formatIDR } from "@/lib/data";
import { seedAccounts } from "@/app/actions/seed-accounts";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounting";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { AccountType } from "@prisma/client";

const ACCOUNT_TYPES = [
    { value: "all", label: "Semua" },
    { value: "Asset", label: "Aset" },
    { value: "Liability", label: "Kewajiban" },
    { value: "Equity", label: "Ekuitas" },
    { value: "Revenue", label: "Pendapatan" },
    { value: "Expense", label: "Beban" },
] as const;

const TYPE_BADGE_COLORS: Record<string, string> = {
    Asset: "bg-info-bg text-info border border-info-border",
    Liability: "bg-warning-bg text-warning border border-warning-border",
    Equity: "bg-purple-bg text-purple border border-purple-border",
    Revenue: "bg-success-bg text-success border border-success-border",
    Expense: "bg-error-muted text-error border border-error/30",
};

interface AccountsViewProps {
    accounts: Account[];
    role: "admin" | "staff" | "client";
}

export function AccountsView({ accounts, role }: AccountsViewProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [showInactive, setShowInactive] = useState(true);
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
    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const toast = useToast();

    const isAdmin = role === "admin" || role === "staff";

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return accounts.filter(a => {
            if (!showInactive && !a.isActive) return false;
            if (typeFilter !== "all" && a.type !== typeFilter) return false;
            if (q && !a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [accounts, search, typeFilter, showInactive]);

    // Summary counts
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: accounts.length };
        for (const a of accounts) {
            counts[a.type] = (counts[a.type] || 0) + 1;
        }
        return counts;
    }, [accounts]);

    const handleSeed = async (force: boolean = false) => {
        if (force && !confirm("Ini akan menghapus akun yang belum dikaitkan dengan transaksi dan menonaktifkan sisanya. Yakin ingin melanjutkan?")) return;

        setIsSeeding(true);
        const res = await seedAccounts(undefined, force);
        setIsSeeding(false);
        if (res?.success) {
            toast.success(res.message || "Akun berhasil dibuat.");
            router.refresh();
        } else {
            toast.error(res?.error || "Gagal menyemai akun");
        }
    };

    const handleDelete = async (id: string, code: string, name: string) => {
        if (!confirm(`Hapus akun ${code} - ${name}?`)) return;
        const res = await deleteAccount(id);
        if (res.success) {
            toast.success(`Akun ${code} berhasil dihapus.`);
            router.refresh();
        } else {
            toast.error(res.error || "Gagal menghapus akun.");
        }
    };

    // Client-side code validation
    const validateCode = (code: string): string | null => {
        const trimmed = code.trim();
        if (!trimmed) return "Kode akun wajib diisi.";
        if (trimmed.length > 10) return "Kode akun maksimal 10 karakter.";
        if (!/^[A-Za-z0-9]+$/.test(trimmed)) return "Kode akun hanya boleh berisi huruf dan angka.";
        return null;
    };

    const openCreateModal = () => {
        setEditingAccount(null);
        setFormData({ code: "", name: "", type: "Asset", isActive: true });
        setFormError("");
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
        setFormError("");
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        // Client-side validation
        const codeError = validateCode(formData.code);
        if (codeError) { setFormError(codeError); return; }
        if (!formData.name.trim()) { setFormError("Nama akun wajib diisi."); return; }
        if (formData.name.trim().length > 200) { setFormError("Nama akun maksimal 200 karakter."); return; }

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
            toast.success(editingAccount ? "Akun berhasil diperbarui." : "Akun berhasil dibuat.");
            router.refresh();
        } else {
            setFormError(res.error || "Gagal menyimpan akun.");
        }
    };

    return (
        <div className="space-y-4 relative">
            {/* Toolbar */}
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
                    {isAdmin && (
                        <>
                            <Button
                                variant="soft"
                                onClick={() => setShowInactive(!showInactive)}
                                className="gap-2 rounded-xl"
                            >
                                {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showInactive ? "Sembunyikan Nonaktif" : "Tampilkan Nonaktif"}
                            </Button>
                            <Button variant="soft" onClick={() => handleSeed(true)} disabled={isSeeding} className="gap-2 rounded-xl text-danger hover:bg-danger/10">
                                <RotateCcw className={`h-4 w-4 ${isSeeding ? 'animate-spin' : ''}`} />
                                Reset & Re-Seed
                            </Button>
                        </>
                    )}
                    {isAdmin && (
                        <Button onClick={openCreateModal} className="gap-2 rounded-xl shadow-sm">
                            Tambah Akun
                        </Button>
                    )}
                </div>
            </div>

            {/* Type filter tabs */}
            <div className="flex flex-wrap gap-1.5">
                {ACCOUNT_TYPES.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setTypeFilter(value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            typeFilter === value
                                ? "bg-accent text-white shadow-sm"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        {label}
                        <span className="ml-1.5 opacity-70">{typeCounts[value] || 0}</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Kode</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Nama Akun</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Tipe</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-right">Saldo</th>
                            <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-center">Status</th>
                            {isAdmin && (
                                <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] text-right w-20"></th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Wallet className="h-10 w-10 text-muted-foreground/30" />
                                        <p className="text-muted-foreground">
                                            {search || typeFilter !== "all"
                                                ? "Tidak ada akun yang cocok dengan filter."
                                                : "Belum ada chart of accounts."}
                                        </p>
                                        {isAdmin && !search && typeFilter === "all" && (
                                            <Button variant="secondary" onClick={() => handleSeed(false)} disabled={isSeeding} className="mt-2">
                                                {isSeeding ? "Memproses..." : "Seed Default CoA"}
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((account) => (
                                <tr
                                    key={account.id}
                                    className={`hover:bg-muted/30 transition-colors group ${!account.isActive ? "opacity-50" : ""}`}
                                >
                                    <td className="p-4 font-mono text-accent">{account.code}</td>
                                    <td className="p-4 font-medium">
                                        {account.name}
                                        {!account.isActive && (
                                            <span className="ml-2 text-[10px] text-muted-foreground uppercase">(nonaktif)</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${TYPE_BADGE_COLORS[account.type] || ""}`}>
                                            {account.type}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-semibold ${account.balance < 0 ? "text-error" : ""}`}>
                                        {formatIDR(account.balance || 0)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {account.isActive ? (
                                            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                        )}
                                    </td>
                                    {isAdmin && (
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
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer summary */}
            {filtered.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                    Menampilkan {filtered.length} dari {accounts.length} akun
                </p>
            )}

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
                            {formError && (
                                <div className="p-3 rounded-lg bg-error-muted border border-error/30 text-error text-sm">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Kode Akun</label>
                                <Input
                                    required
                                    maxLength={10}
                                    pattern="[A-Za-z0-9]+"
                                    title="Hanya huruf dan angka"
                                    value={formData.code}
                                    onChange={e => {
                                        setFormData({ ...formData, code: e.target.value });
                                        setFormError("");
                                    }}
                                    placeholder="Contoh: 1101"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Nama Akun</label>
                                <Input
                                    required
                                    maxLength={200}
                                    value={formData.name}
                                    onChange={e => {
                                        setFormData({ ...formData, name: e.target.value });
                                        setFormError("");
                                    }}
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
