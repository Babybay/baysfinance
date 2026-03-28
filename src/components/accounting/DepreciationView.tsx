"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Calculator, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { formatIDR } from "@/lib/data";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";
import { runMonthlyDepreciation, getFixedAssets } from "@/app/actions/accounting/depreciation";
import { useToast } from "@/components/ui/Toast";

export function DepreciationView() {
    const now = new Date();
    const { selectedClientId: selectedClient } = useSelectedClient();
    const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    const [running, setRunning] = useState(false);
    const [assets, setAssets] = useState<any[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const toast = useToast();

    const fetchAssets = async () => {
        if (!selectedClient) { setAssets([]); return; }
        setLoadingAssets(true);
        const res = await getFixedAssets(selectedClient);
        if (res.success && "data" in res) setAssets(res.data || []);
        else setAssets([]);
        setLoadingAssets(false);
    };

    useEffect(() => {
        fetchAssets();
        setLastResult(null);
    }, [selectedClient]);

    const handleRun = async () => {
        if (!selectedClient || !period) return;
        if (!confirm(`Jalankan penyusutan untuk periode ${period}? Jurnal akan dibuat secara otomatis.`)) return;

        setRunning(true);
        const res = await runMonthlyDepreciation({ clientId: selectedClient, period });
        setRunning(false);

        if (res.success && "data" in res && res.data) {
            setLastResult(res.data);
            toast.success(`Penyusutan ${formatIDR(res.data.totalDepreciation)} berhasil dicatat. Ref: ${res.data.journalRefNumber}`);
        } else {
            toast.error(res.error || "Gagal menjalankan penyusutan.");
        }
    };

    // Generate period options (last 12 months)
    const periodOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
        return { value: val, label };
    });

    const totalBookValue = assets.reduce((s, a) => s + a.bookValue, 0);
    const totalCost = assets.reduce((s, a) => s + a.costCurrent, 0);
    const totalAccumDeprec = assets.reduce((s, a) => s + a.accumDeprecCurrent, 0);

    return (
        <div className="space-y-6">
            {/* Controls */}
            <Card className="rounded-xl border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5 text-accent" />
                        Penyusutan Aset Tetap (Bulanan)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Periode</label>
                            <Select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                options={periodOptions}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleRun} disabled={running || !selectedClient || !period} className="gap-2 w-full md:w-auto">
                                <Calculator className="h-4 w-4" />
                                {running ? "Memproses..." : "Jalankan Penyusutan"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-warning-bg border border-warning-border rounded-lg p-3 text-sm text-warning flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Penyusutan dihitung dengan metode garis lurus (straight-line) bulanan: (Harga Perolehan × Tarif) / 12. Jurnal otomatis: Dr Beban Penyusutan (708) — Cr Akum. Penyusutan (212).</p>
                    </div>
                </CardContent>
            </Card>

            {/* Last Result */}
            {lastResult && (
                <Card className="rounded-xl border-success/30 bg-success/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            Penyusutan Berhasil — Periode {lastResult.period}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jumlah Aset</div>
                                <div className="text-lg font-bold">{lastResult.assetsCount}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Penyusutan</div>
                                <div className="text-lg font-bold text-accent">{formatIDR(lastResult.totalDepreciation)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ref Jurnal</div>
                                <div className="text-lg font-bold font-mono text-accent">{lastResult.journalRefNumber}</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="p-2 text-left font-bold text-muted-foreground text-[10px] uppercase">Aset</th>
                                        <th className="p-2 text-right font-bold text-muted-foreground text-[10px] uppercase">Penyusutan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {lastResult.details.map((d: any, i: number) => (
                                        <tr key={i}>
                                            <td className="p-2">{d.name}</td>
                                            <td className="p-2 text-right font-semibold">{formatIDR(d.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Asset List */}
            {selectedClient && (
                <Card className="rounded-xl border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            Daftar Aset Tetap
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingAssets ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : assets.length === 0 ? (
                            <p className="p-8 text-center text-muted-foreground">Belum ada aset tetap. Import data aset melalui menu Import.</p>
                        ) : (
                            <>
                                {/* Summary cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Harga Perolehan</div>
                                        <div className="text-lg font-bold">{formatIDR(totalCost)}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Akum. Penyusutan</div>
                                        <div className="text-lg font-bold text-warning">{formatIDR(totalAccumDeprec)}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Nilai Buku</div>
                                        <div className="text-lg font-bold text-accent">{formatIDR(totalBookValue)}</div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="p-3 text-left font-bold text-muted-foreground text-[10px] uppercase">Nama Aset</th>
                                                <th className="p-3 text-center font-bold text-muted-foreground text-[10px] uppercase">Qty</th>
                                                <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Tarif (%)</th>
                                                <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Harga Perolehan</th>
                                                <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Akum. Penyusutan</th>
                                                <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Nilai Buku</th>
                                                <th className="p-3 text-right font-bold text-muted-foreground text-[10px] uppercase">Penyusutan/Bulan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {assets.map((asset) => {
                                                const monthly = asset.costCurrent > 0 && asset.depreciationRate > 0 && asset.bookValue > 0
                                                    ? Math.min(
                                                        Math.round((asset.costCurrent * asset.depreciationRate / 12) * 100) / 100,
                                                        asset.bookValue
                                                    )
                                                    : 0;
                                                return (
                                                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="p-3 font-medium">{asset.name}</td>
                                                        <td className="p-3 text-center">{asset.quantity}</td>
                                                        <td className="p-3 text-right">{(asset.depreciationRate * 100).toFixed(1)}%</td>
                                                        <td className="p-3 text-right">{formatIDR(asset.costCurrent)}</td>
                                                        <td className="p-3 text-right text-warning">{formatIDR(asset.accumDeprecCurrent)}</td>
                                                        <td className="p-3 text-right font-semibold text-accent">{formatIDR(asset.bookValue)}</td>
                                                        <td className="p-3 text-right font-semibold">
                                                            {monthly > 0 ? formatIDR(monthly) : <span className="text-muted-foreground">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-border font-bold">
                                                <td className="p-3" colSpan={3}>Total</td>
                                                <td className="p-3 text-right">{formatIDR(totalCost)}</td>
                                                <td className="p-3 text-right text-warning">{formatIDR(totalAccumDeprec)}</td>
                                                <td className="p-3 text-right text-accent">{formatIDR(totalBookValue)}</td>
                                                <td className="p-3 text-right">
                                                    {formatIDR(assets.reduce((s, a) => {
                                                        if (a.costCurrent <= 0 || a.depreciationRate <= 0 || a.bookValue <= 0) return s;
                                                        return s + Math.min(Math.round((a.costCurrent * a.depreciationRate / 12) * 100) / 100, a.bookValue);
                                                    }, 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
