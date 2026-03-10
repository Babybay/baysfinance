"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Search, BookOpen, Trash2, Save, X, ChevronRight, Hash } from "lucide-react";
import { JournalEntry, JournalItem, Account, Client, formatIDR } from "@/lib/data";
import { createJournalEntry, getAccounts } from "@/app/actions/accounting";
import { seedAccounts } from "@/app/actions/seed-accounts";
import { useRouter } from "next/navigation";

import { JournalStatus } from "@prisma/client";

interface JournalEntriesListViewProps {
    initialEntries: JournalEntry[];
    clients: Client[];
    accounts: Account[];
}

export function JournalEntriesListView({ initialEntries, clients, accounts }: JournalEntriesListViewProps) {
    const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const router = useRouter();

    const [form, setForm] = useState({
        reference: `JV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        clientId: "",
        description: "",
        items: [
            { accountId: "", description: "", debit: 0, credit: 0 },
            { accountId: "", description: "", debit: 0, credit: 0 },
        ],
    });

    const totalDebit = form.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = form.items.reduce((sum, item) => sum + item.credit, 0);
    const isValid = totalDebit === totalCredit && totalDebit > 0 && form.clientId && form.items.every(item => item.accountId);

    const addItem = () => setForm({
        ...form,
        items: [...form.items, { accountId: "", description: "", debit: 0, credit: 0 }]
    });

    const removeItem = (index: number) => {
        if (form.items.length <= 2) return;
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    };

    const updateItem = (index: number, field: keyof any, value: any) => {
        const updated = [...form.items];
        (updated[index] as any)[field] = value;

        // If debit is entered, clear credit and vice versa (usually one side per row in simple JV)
        if (field === "debit" && value > 0) updated[index].credit = 0;
        if (field === "credit" && value > 0) updated[index].debit = 0;

        setForm({ ...form, items: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        const res = await createJournalEntry({
            reference: form.reference,
            date: new Date(form.date),
            clientId: form.clientId,
            description: form.description,
            items: form.items.map(item => ({
                accountId: item.accountId,
                description: item.description,
                debit: item.debit,
                credit: item.credit
            }))
        });

        if (res.success) {
            setModalOpen(false);
            router.refresh();
            // Reset form for next time
            setForm({
                reference: `JV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
                date: new Date().toISOString().split('T')[0],
                clientId: "",
                description: "",
                items: [
                    { accountId: "", description: "", debit: 0, credit: 0 },
                    { accountId: "", description: "", debit: 0, credit: 0 },
                ],
            });
        } else {
            alert(res.error || "Gagal menyimpan jurnal");
        }
    };

    const filtered = entries.filter(entry =>
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
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-10"></th>
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
                                                <Button variant="transparent" onClick={() => setModalOpen(true)} className="text-accent underline">Buat jurnal pertama</Button>
                                                {accounts.length === 0 && (
                                                    <Button variant="transparent" onClick={async () => {
                                                        const res = await seedAccounts();
                                                        if (res.success) router.refresh();
                                                        else alert(res.error);
                                                    }} className="text-accent underline border-l border-border pl-2">Gunakan CoA Standar</Button>
                                                )}
                                            </div>

                                        </div>

                                    </td>
                                </tr>
                            ) : (
                                filtered.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => {/* row details */ }}>
                                        <td className="p-4 text-sm font-medium">{new Date(entry.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-4 text-sm font-mono text-accent">{entry.reference}</td>
                                        <td className="p-4 text-sm">{entry.clientName}</td>
                                        <td className="p-4 text-sm text-muted-foreground lg:max-w-xs truncate">{entry.description}</td>
                                        <td className="p-4 text-sm font-semibold text-right">{formatIDR(entry.totalAmount)}</td>
                                        <td className="p-4 text-sm">
                                            <Badge variant={entry.status === 'Posted' ? 'success' : 'default'} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                {entry.status}
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
            </div>

            {/* Create Journal Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Tambah Jurnal Umum"
                size="xl"
            >

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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nomor Referensi</label>
                            <Input
                                value={form.reference}
                                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                                placeholder="Auto-generated"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih Klien</label>
                            <Select
                                value={form.clientId}
                                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                required
                                options={clients.map(c => ({ value: c.id, label: c.nama }))}
                                placeholder="Pilih Klien..."
                            />
                        </div>

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
                                        <th className="p-3 w-10"></th>
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
                                                    options={accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
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
                                                    onChange={(e) => updateItem(index, "debit", parseFloat(e.target.value) || 0)}
                                                    className="border-transparent bg-transparent focus:bg-background h-9 rounded-lg text-right"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    value={item.credit === 0 ? "" : item.credit}
                                                    onChange={(e) => updateItem(index, "credit", parseFloat(e.target.value) || 0)}
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
                                        <td colSpan={2} className="p-3 text-right text-xs uppercase text-muted-foreground">Total</td>
                                        <td className="p-3 text-right text-sm border-l border-border">{formatIDR(totalDebit)}</td>
                                        <td className="p-3 text-right text-sm border-l border-border">{formatIDR(totalCredit)}</td>
                                        <td className="p-3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-between items-center p-1">
                            <Button type="button" variant="transparent" onClick={addItem} className="gap-2 text-accent hover:text-accent/80 hover:bg-accent/5 rounded-lg border border-transparent hover:border-accent/20">
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
                        <Button type="button" variant="soft" onClick={() => setModalOpen(false)} className="rounded-xl px-6">Batal</Button>
                        <Button type="submit" variant="dark" disabled={!isValid} className="gap-2 rounded-xl px-8 shadow-md">
                            <Save className="h-4 w-4" />
                            Simpan Jurnal
                        </Button>
                    </div>

                </form>
            </Modal>
        </div>
    );
}
