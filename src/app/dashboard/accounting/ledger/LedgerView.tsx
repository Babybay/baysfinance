"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, Layers, Calendar, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
import { Account, Client, formatIDR } from "@/lib/data";
import { getGeneralLedger } from "@/app/actions/accounting";

interface LedgerViewProps {
    accounts: Account[];
    clients: Client[];
}

export function LedgerView({ accounts, clients }: LedgerViewProps) {
    const [selectedAccount, setSelectedAccount] = useState("");
    const [selectedClient, setSelectedClient] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchLedger = async () => {
        if (!selectedAccount || !selectedClient) return;
        setLoading(true);
        const res = await getGeneralLedger(
            selectedAccount,
            selectedClient,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
        if (res.success) {
            setLedgerData(res.data || []);
            setTotalBalance(res.totalBalance || 0);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLedger();
    }, [selectedAccount, selectedClient, startDate, endDate]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Klien</label>
                    <Select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        options={clients.map(c => ({ value: c.id, label: c.nama }))}
                        placeholder="Pilih Klien..."
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Akun</label>
                    <Select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        options={accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                        placeholder="Pilih Akun..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dari Tanggal</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sampai Tanggal</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
            </div>

            {!selectedAccount || !selectedClient ? (
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Silakan pilih klien dan akun untuk melihat buku besar.</p>
                </div>
            ) : loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground font-medium">Memuat data buku besar...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-lg font-serif">{accounts.find(a => a.id === selectedAccount)?.name}</h2>
                            <p className="text-sm text-muted-foreground">Kode Akun: {accounts.find(a => a.id === selectedAccount)?.code}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saldo Akhir</p>
                            <p className="text-2xl font-bold text-accent">{formatIDR(totalBalance)}</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referensi</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Keterangan</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Debit</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Kredit</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {ledgerData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground">Tidak ada transaksi pada periode ini.</td>
                                    </tr>
                                ) : (
                                    ledgerData.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 text-sm">{new Date(item.journalEntry.date).toLocaleDateString('id-ID')}</td>
                                            <td className="p-4 text-sm font-mono text-accent">{item.journalEntry.refNumber}</td>
                                            <td className="p-4 text-sm text-muted-foreground">{item.description || item.journalEntry.description}</td>
                                            <td className="p-4 text-sm text-right font-medium">{item.debit > 0 ? formatIDR(item.debit) : "-"}</td>
                                            <td className="p-4 text-sm text-right font-medium">{item.credit > 0 ? formatIDR(item.credit) : "-"}</td>
                                            <td className="p-4 text-sm text-right font-semibold">{formatIDR(item.runningBalance)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
