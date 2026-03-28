"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Search, BookOpen, Trash2, Save, ChevronRight, Hash, ChevronLeft } from "lucide-react";
import { JournalEntry, Account, formatIDR } from "@/lib/data";
import { createJournalEntry, getJournalEntries } from "@/app/actions/accounting";
import { seedAccounts } from "@/app/actions/seed-accounts";
import { useRouter } from "next/navigation";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";
import { useRoles } from "@/lib/hooks/useRoles";
import { useToast } from "@/components/ui/Toast";

interface JournalEntriesListViewProps {
    initialEntries: JournalEntry[];
    accounts: Account[];
    total: number;
    page: number;
    pageSize: number;
    initialSearch?: string;
}

export function JournalEntriesListView({
    initialEntries,
    accounts,
    total,
    page,
    pageSize,
    initialSearch = "",
}: JournalEntriesListViewProps) {
    const { selectedClientId: defaultClientId, clients } = useSelectedClient();
    const { isClient: isClientRole } = useRoles();
    const toast = useToast();
    const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
    const [currentTotal, setCurrentTotal] = useState(total);
    const [currentPage, setCurrentPage] = useState(page);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState(initialSearch);
    const [modalOpen, setModalOpen] = useState(false);
    const router = useRouter();

    const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));

    // Fetch entries when selected client or page changes
    const fetchEntries = useCallback(async () => {
        if (!defaultClientId) {
            setEntries([]);
            setCurrentTotal(0);
            return;
        }
        setLoading(true);
        const res = await getJournalEntries(defaultClientId, currentPage, pageSize);
        if (res.success) {
            setEntries(res.data as unknown as JournalEntry[]);
            setCurrentTotal(res.total);
        }
        setLoading(false);
    }, [defaultClientId, currentPage, pageSize]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // L2: reference is no longer generated client-side — the server always generates it atomically
    const [form, setForm] = useState({
        date: new Date().toISOString().split("T")[0],
        clientId: defaultClientId,
        description: "",
        items: [
            { accountId: "", description: "", debit: 0, credit: 0 },
            { accountId: "", description: "", debit: 0, credit: 0 },
        ],
    });

    // Sync form clientId with global selection
    useEffect(() => {
        if (defaultClientId) {
            setForm((prev) => ({ ...prev, clientId: defaultClientId }));
        }
    }, [defaultClientId]);

    const totalDebit = form.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = form.items.reduce((sum, item) => sum + item.credit, 0);
    const isValid =
        totalDebit === totalCredit &&
        totalDebit > 0 &&
        form.clientId &&
        form.items.every((item) => item.accountId);

    const addItem = () =>
        setForm({
            ...form,
            items: [...form.items, { accountId: "", description: "", debit: 0, credit: 0 }],
        });

    const removeItem = (index: number) => {
        if (form.items.length <= 2) return;
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    };

    const updateItem = (index: number, field: string, value: string | number) => {
        const updated = [...form.items];
        (updated[index] as Record<string, unknown>)[field] = value;
        if (field === "debit" && (value as number) > 0) updated[index].credit = 0;
        if (field === "credit" && (value as number) > 0) updated[index].debit = 0;
        setForm({ ...form, items: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        const res = await createJournalEntry({
            date: new Date(form.date),
            clientId: form.clientId,
            description: form.description,
            items: form.items.map((item) => ({
                accountId: item.accountId,
                description: item.description,
                debit: item.debit,
                credit: item.credit,
            })),
        });

        if (res.success) {
            setModalOpen(false);
            fetchEntries();
            setForm({
                date: new Date().toISOString().split("T")[0],
                clientId: defaultClientId,
                description: "",
                items: [
                    { accountId: "", description: "", debit: 0, credit: 0 },
                    { accountId: "", description: "", debit: 0, credit: 0 },
                ],
            });
        } else {
            toast.error(res.error || "Gagal menyimpan jurnal");
        }
    };

    const goToPage = (p: number) => {
        setCurrentPage(p);
    };

    const filtered = entries.filter(
        (entry) =>
            (entry.reference?.toLowerCase() || "").includes(search.toLowerCase()) ||
            (entry.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
            (entry.clientName?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                        placeholder="Cari referensi, deskripsi, atau klien..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-background/50 border-border focus:border-accent/50 transition-all rounded-xl"
                    />
                </div>
                <Button onClick={() => setModalOpen(true)} className="gap-2 rounded-xl shadow-sm">
                    <Plus className="h-4 w-4" />
                    Tambah Jurnal
                </Button>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referensi</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Klien</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keterangan</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Total</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="p-4 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-muted-foreground font-medium">Belum ada jurnal entri.</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="transparent"
                                                    onClick={() => setModalOpen(true)}
                                                    className="text-accent underline"
                                                >
                                                    Buat jurnal pertama
                                                </Button>
                                                {accounts.length === 0 && (
                                                    <Button
                                                        variant="transparent"
                                                        onClick={async () => {
                                                            const res = await seedAccounts();
                                                            if (res.success) router.refresh();
                                                            else toast.error(res.error || "Gagal seed akun");
                                                        }}
                                                        className="text-accent underline border-l border-border pl-2"
                                                    >
                                                        Gunakan CoA Standar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                    >
                                        <td className="p-4 text-sm font-medium">
                                            {new Date(entry.date).toLocaleDateString("id-ID")}
                                        </td>
                                        <td className="p-4 text-sm font-mono text-accent">{entry.reference}</td>
                                        <td className="p-4 text-sm">{entry.clientName}</td>
                                        <td className="p-4 text-sm text-muted-foreground lg:max-w-xs truncate">
                                            {entry.description}
                                        </td>
                                        <td className="p-4 text-sm font-semibold text-right">
                                            {formatIDR(entry.totalAmount)}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <Badge
                                                variant={entry.status === "Posted" ? "success" : entry.status === "Reversed" ? "danger" : "default"}
                                                className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            >
                                                {entry.status === "Reversed" ? "Dibalik" : entry.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* M4: Pagination controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} entri
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="soft"
                                size="default"
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1}
                                className="gap-1 rounded-lg px-3 h-8"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Prev
                            </Button>
                            <span className="text-xs font-medium px-2">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="soft"
                                size="default"
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages}
                                className="gap-1 rounded-lg px-3 h-8"
                            >
                                Next
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Journal Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Jurnal Umum" size="xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tanggal</label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>

                        {/* L2: reference shown as read-only — always generated server-side */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                Nomor Referensi
                            </label>
                            <Input
                                value="Auto-generated"
                                readOnly
                                disabled
                                className="bg-muted/30 text-muted-foreground cursor-not-allowed"
                            />
                        </div>

                        {/* Client selector — hidden for client-role users (auto-set to their own) */}
                        {!isClientRole && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pilih Klien</label>
                                <Select
                                    value={form.clientId}
                                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    required
                                    options={clients.map((c) => ({ value: c.id, label: c.nama }))}
                                    placeholder="Pilih Klien..."
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Keterangan</label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Deskripsi transaksi..."
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Baris Akun
                            </h3>
                        </div>

                        <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                                        <th className="p-3">Nama Akun</th>
                                        <th className="p-3">Keterangan</th>
                                        <th className="p-3 text-right w-36">Debit</th>
                                        <th className="p-3 text-right w-36">Kredit</th>
                                        <th className="p-3 w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-background">
                                    {form.items.map((item, index) => (
                                        <tr key={index} className="group">
                                            <td className="p-2">
                                                <Select
                                                    value={item.accountId}
                                                    onChange={(e) => updateItem(index, "accountId", e.target.value)}
                                                    className="border-transparent bg-transparent focus:bg-background h-9 rounded-lg"
                                                    required
                                                    options={accounts.map((a) => ({
                                                        value: a.id,
                                                        label: `${a.code} - ${a.name}`,
                                                    }))}
                                                    placeholder="Pilih Akun..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, "description", e.target.value)}
                                                    className="border-transparent bg-transparent focus:bg-background h-9 rounded-lg"
                                                    placeholder="Keterangan baris (opsional)"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    value={item.debit === 0 ? "" : item.debit}
                                                    onChange={(e) =>
                                                        updateItem(index, "debit", parseFloat(e.target.value) || 0)
                                                    }
                                                    className="border-transparent bg-transparent focus:bg-background h-9 rounded-lg text-right"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    value={item.credit === 0 ? "" : item.credit}
                                                    onChange={(e) =>
                                                        updateItem(index, "credit", parseFloat(e.target.value) || 0)
                                                    }
                                                    className="border-transparent bg-transparent focus:bg-background h-9 rounded-lg text-right"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Button
                                                    type="button"
                                                    variant="transparent"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                                    disabled={form.items.length <= 2}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/30 font-semibold h-12">
                                        <td colSpan={2} className="p-3 text-right text-xs uppercase text-muted-foreground">
                                            Total
                                        </td>
                                        <td className="p-3 text-right text-sm border-l border-border">
                                            {formatIDR(totalDebit)}
                                        </td>
                                        <td className="p-3 text-right text-sm border-l border-border">
                                            {formatIDR(totalCredit)}
                                        </td>
                                        <td className="p-3" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-between items-center p-1">
                            <Button
                                type="button"
                                variant="transparent"
                                onClick={addItem}
                                className="gap-2 text-accent hover:text-accent/80 hover:bg-accent/5 rounded-lg border border-transparent hover:border-accent/20"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Baris
                            </Button>

                            {totalDebit !== totalCredit && totalDebit > 0 && totalCredit > 0 && (
                                <div className="text-[10px] font-bold text-danger bg-danger/10 px-3 py-1.5 rounded-full uppercase tracking-tighter animate-pulse">
                                    Debit & Kredit tidak seimbang: Selisih {formatIDR(Math.abs(totalDebit - totalCredit))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="soft"
                            onClick={() => setModalOpen(false)}
                            className="rounded-xl px-6"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="dark"
                            disabled={!isValid}
                            className="gap-2 rounded-xl px-8 shadow-md"
                        >
                            <Save className="h-4 w-4" />
                            Simpan Jurnal
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
