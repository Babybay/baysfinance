"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatIDR } from "@/lib/data";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";
import { closeFiscalPeriod, getFiscalCloses } from "@/app/actions/accounting/fiscal-close";
import { useToast } from "@/components/ui/Toast";

export function FiscalCloseView() {
    const { selectedClientId: selectedClient } = useSelectedClient();
    const [periodLabel, setPeriodLabel] = useState(String(new Date().getFullYear()));
    const [periodStart, setPeriodStart] = useState(`${new Date().getFullYear()}-01-01`);
    const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`);
    const [closing, setClosing] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const toast = useToast();

    const fetchHistory = async () => {
        if (!selectedClient) return;
        setLoadingHistory(true);
        const res = await getFiscalCloses(selectedClient);
        if (res.success) setHistory(res.data);
        setLoadingHistory(false);
    };

    useEffect(() => {
        fetchHistory();
    }, [selectedClient]);

    const handleClose = async () => {
        if (!selectedClient) return;
        if (!confirm(`Tutup periode "${periodLabel}"? Tindakan ini tidak dapat dibatalkan.`)) return;

        setClosing(true);
        const res = await closeFiscalPeriod({
            clientId: selectedClient,
            periodLabel,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
        });
        setClosing(false);

        if (res.success && "data" in res && res.data) {
            const d = res.data;
            toast.success(
                `Periode ${periodLabel} ditutup. Laba bersih: ${formatIDR(d.netIncome)}. Ref: ${d.journalRefNumber}`
            );
            fetchHistory();
        } else {
            toast.error(res.error || "Gagal menutup periode.");
        }
    };

    return (
        <div className="space-y-6">
            <Card className="rounded-xl border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Lock className="h-5 w-5 text-accent" />
                        Tutup Periode Fiskal
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label Periode</label>
                            <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="2025" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dari Tanggal</label>
                            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sampai Tanggal</label>
                            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-warning-bg border border-warning-border rounded-lg p-3 text-sm text-warning flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Penutupan periode akan membuat jurnal penutup yang menolkan semua akun Pendapatan dan Beban, serta mentransfer laba bersih ke Saldo Laba (513). Pastikan semua jurnal sudah diposting.</p>
                    </div>

                    <Button onClick={handleClose} disabled={closing || !selectedClient || !periodLabel} className="gap-2">
                        <Lock className="h-4 w-4" />
                        {closing ? "Menutup Periode..." : "Tutup Periode"}
                    </Button>
                </CardContent>
            </Card>

            {/* History */}
            {selectedClient && (
                <Card className="rounded-xl border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Riwayat Penutupan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingHistory ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : history.length === 0 ? (
                            <p className="p-8 text-center text-muted-foreground">Belum ada periode yang ditutup.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="p-3 text-left font-bold text-muted-foreground text-[10px] uppercase">Periode</th>
                                            <th className="p-3 text-left font-bold text-muted-foreground text-[10px] uppercase">Tanggal Tutup</th>
                                            <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Laba Bersih</th>
                                            <th className="p-3 text-left font-bold text-muted-foreground text-[10px] uppercase">Ref Jurnal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {history.map((close) => (
                                            <tr key={close.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-medium flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                                    {close.periodLabel}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {new Date(close.closedAt).toLocaleDateString("id-ID")}
                                                </td>
                                                <td className={`p-3 text-right font-semibold ${close.netIncome < 0 ? "text-error" : "text-success"}`}>
                                                    {formatIDR(close.netIncome)}
                                                </td>
                                                <td className="p-3 font-mono text-accent">{close.journalRefNumber}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
