"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Search, Wallet, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw,
    Eye, EyeOff, Briefcase, UtensilsCrossed, ShoppingCart, Factory,
    HardHat, Monitor, ChevronRight,
} from "lucide-react";
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

// ── Template definitions (synced with coa-templates.ts) ─────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
    Briefcase,
    UtensilsCrossed,
    ShoppingCart,
    Factory,
    HardHat,
    Monitor,
};

interface TemplateInfo {
    id: string;
    name: string;
    description: string;
    icon: string;
    accountCount: number;
}

const TEMPLATES: TemplateInfo[] = [
    { id: "jasa-konsultan", name: "Jasa Konsultan", description: "Kantor konsultan, akuntan, hukum, dan jasa profesional lainnya", icon: "Briefcase", accountCount: 40 },
    { id: "hotel-restoran", name: "Hotel & Restoran", description: "Hotel, restoran, kafe, katering, dan usaha F&B lainnya", icon: "UtensilsCrossed", accountCount: 74 },
    { id: "perdagangan", name: "Perdagangan Umum", description: "Toko retail, distributor, grosir, dan usaha jual-beli barang", icon: "ShoppingCart", accountCount: 43 },
    { id: "manufaktur", name: "Manufaktur", description: "Pabrik, pengolahan, dan usaha produksi barang", icon: "Factory", accountCount: 49 },
    { id: "konstruksi", name: "Konstruksi", description: "Kontraktor, pengembang properti, dan jasa konstruksi", icon: "HardHat", accountCount: 49 },
    { id: "startup-tech", name: "Startup & Teknologi", description: "Perusahaan SaaS, startup digital, IT services, dan e-commerce", icon: "Monitor", accountCount: 44 },
];

interface AccountsViewProps {
    accounts: Account[];
    role: "admin" | "staff" | "client";
}

export function AccountsView({ accounts, role }: AccountsViewProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [showInactive, setShowInactive] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedingTemplateId, setSeedingTemplateId] = useState<string | null>(null);

    // Template picker state
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [templatePickerForce, setTemplatePickerForce] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        type: "Asset" as AccountType,
        isActive: true,
    });
    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const toast = useToast();

    const isAdmin = role === "admin" || role === "staff";

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return accounts.filter((a) => {
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

    const handleSeedWithTemplate = async (templateId: string, force: boolean) => {
        if (force && !confirm("Ini akan menghapus akun yang belum dikaitkan dengan transaksi dan menonaktifkan sisanya. Yakin ingin melanjutkan?")) return;

        setIsSeeding(true);
        setSeedingTemplateId(templateId);
        const res = await seedAccounts(undefined, force, templateId);
        setIsSeeding(false);
        setSeedingTemplateId(null);
        setShowTemplatePicker(false);
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
            isActive: account.isActive,
        });
        setFormError("");
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

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

    const hasAccounts = accounts.length > 0;

    return (
        <div className="space-y-4 relative">
            {/* ── Empty state: Template Picker ─────────────────────────────────── */}
            {!hasAccounts && isAdmin && (
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                        <h2 className="font-serif text-xl">Pilih Template Chart of Accounts</h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Pilih template yang sesuai dengan jenis usaha klien. Template menyediakan akun-akun standar yang dapat disesuaikan setelahnya.
                        </p>
                    </div>
                    <TemplateGrid
                        templates={TEMPLATES}
                        onSelect={(id) => handleSeedWithTemplate(id, false)}
                        isSeeding={isSeeding}
                        seedingTemplateId={seedingTemplateId}
                    />
                </div>
            )}

            {!hasAccounts && !isAdmin && (
                <div className="p-12 text-center">
                    <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">Belum ada chart of accounts.</p>
                </div>
            )}

            {/* ── Main content (when accounts exist) ──────────────────────────── */}
            {hasAccounts && (
                <>
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
                                    <Button
                                        variant="soft"
                                        onClick={() => {
                                            setTemplatePickerForce(true);
                                            setShowTemplatePicker(true);
                                        }}
                                        disabled={isSeeding}
                                        className="gap-2 rounded-xl text-danger hover:bg-danger/10"
                                    >
                                        <RotateCcw className={`h-4 w-4 ${isSeeding ? "animate-spin" : ""}`} />
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
                                            <p className="text-muted-foreground">Tidak ada akun yang cocok dengan filter.</p>
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
                </>
            )}

            {/* ── Template Picker Modal (for Re-Seed) ─────────────────────────── */}
            {showTemplatePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="font-serif text-xl">Pilih Template CoA</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {templatePickerForce
                                        ? "Akun lama tanpa transaksi akan dihapus, yang ada transaksi akan dinonaktifkan."
                                        : "Pilih template untuk membuat chart of accounts baru."}
                                </p>
                            </div>
                            <Button variant="transparent" size="icon" onClick={() => setShowTemplatePicker(false)}>
                                <XCircle className="h-5 w-5 opacity-50" />
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <TemplateGrid
                                templates={TEMPLATES}
                                onSelect={(id) => handleSeedWithTemplate(id, templatePickerForce)}
                                isSeeding={isSeeding}
                                seedingTemplateId={seedingTemplateId}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Account Create/Edit Modal ───────────────────────────────────── */}
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
                                    onChange={(e) => {
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
                                    onChange={(e) => {
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
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
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
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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

// ── Template Grid Component ─────────────────────────────────────────────────

function TemplateGrid({
    templates,
    onSelect,
    isSeeding,
    seedingTemplateId,
}: {
    templates: TemplateInfo[];
    onSelect: (id: string) => void;
    isSeeding: boolean;
    seedingTemplateId: string | null;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => {
                const IconComponent = ICON_MAP[t.icon] || Briefcase;
                const isActive = seedingTemplateId === t.id;

                return (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.id)}
                        disabled={isSeeding}
                        className={`group relative text-left p-5 rounded-xl border transition-all duration-200 ${
                            isActive
                                ? "border-accent bg-accent/5 shadow-md"
                                : "border-border bg-card hover:border-accent/50 hover:shadow-md hover:bg-accent/5"
                        } ${isSeeding && !isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`shrink-0 p-2.5 rounded-lg transition-colors ${
                                isActive
                                    ? "bg-accent text-white"
                                    : "bg-muted/50 text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
                            }`}>
                                <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-semibold text-sm truncate">{t.name}</h4>
                                    {isActive ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mt-2">
                                    {t.accountCount} akun
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
