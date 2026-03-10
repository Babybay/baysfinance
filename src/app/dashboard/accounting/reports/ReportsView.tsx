"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, Printer, Download } from "lucide-react";
import { Client, formatIDR } from "@/lib/data";
import { getFinancialReports } from "@/app/actions/accounting";

interface ReportsViewProps {
    clients: Client[];
}

export function ReportsView({ clients }: ReportsViewProps) {
    const [selectedClient, setSelectedClient] = useState("");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        if (!selectedClient) return;
        setLoading(true);
        const res = await getFinancialReports(selectedClient, new Date(endDate));
        if (res.success) {
            setReportData(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReport();
    }, [selectedClient, endDate]);

    if (!selectedClient) {
        return (
            <div className="space-y-6">
                <Card className="rounded-xl border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Klien</label>
                                <Select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    options={clients.map(c => ({ value: c.id, label: c.nama }))}
                                    placeholder="Pilih Klien..."
                                />

                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per Tanggal</label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="p-20 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Pilih klien dan tanggal untuk melihat laporan keuangan.</p>
                </div>
            </div>
        );
    }

    const neraca = reportData?.neraca || { assets: [], liabilities: [], equity: [] };
    const labaRugi = reportData?.labaRugi || { revenue: [], expenses: [] };

    const totalAssets = neraca.assets.reduce((sum: number, a: any) => sum + a.value, 0);
    const totalLiabilities = neraca.liabilities.reduce((sum: number, a: any) => sum + a.value, 0);
    const totalEquity = neraca.equity.reduce((sum: number, a: any) => sum + a.value, 0);

    const totalRevenue = labaRugi.revenue.reduce((sum: number, a: any) => sum + a.value, 0);
    const totalExpenses = labaRugi.expenses.reduce((sum: number, a: any) => sum + a.value, 0);
    const netProfit = totalRevenue - totalExpenses;

    return (
        <div className="space-y-6">
            <Card className="rounded-xl border-border overflow-hidden shadow-sm">
                <CardContent className="p-4 bg-muted/30">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Klien</label>
                                <Select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    options={clients.map(c => ({ value: c.id, label: c.nama }))}
                                    placeholder="Pilih Klien..."
                                />

                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per Tanggal</label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="soft" className="gap-2 flex-1 md:flex-none">
                                <Printer className="h-4 w-4" />
                                Cetak
                            </Button>
                            <Button variant="dark" className="gap-2 flex-1 md:flex-none">
                                <Download className="h-4 w-4" />
                                PDF
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Menghitung laporan keuangan...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lab/Rugi Summary */}
                    <Card className="rounded-2xl border-border overflow-hidden shadow-md col-span-1 md:col-span-2 bg-dark-surface text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-dark-text/60">Profit & Loss Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-6">
                            <div className="flex flex-col md:flex-row justify-between gap-8">
                                <div>
                                    <p className="text-4xl font-serif">{formatIDR(netProfit)}</p>
                                    <p className="text-sm text-dark-text/70 mt-1 flex items-center gap-1">
                                        {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-error" />}
                                        Laba Bersih Tahun Berjalan
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-8 md:gap-16">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-dark-text/50">Total Pendapatan</p>
                                        <p className="text-xl font-semibold mt-1">{formatIDR(totalRevenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-dark-text/50">Total Beban</p>
                                        <p className="text-xl font-semibold mt-1 text-error-muted">{formatIDR(totalExpenses)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Balance Sheet */}
                    <Card className="rounded-xl border-border shadow-sm">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-serif">Neraca (Balance Sheet)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                <div className="p-4 space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        Aset
                                        <span>{formatIDR(totalAssets)}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {neraca.assets.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-medium">{formatIDR(a.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        Kewajiban
                                        <span>{formatIDR(totalLiabilities)}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {neraca.liabilities.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-medium font-mono">{formatIDR(a.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        Ekuitas
                                        <span>{formatIDR(totalEquity + netProfit)}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {neraca.equity.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-medium">{formatIDR(a.value)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm italic text-accent font-medium">
                                            <span>Laba Berjalan</span>
                                            <span>{formatIDR(netProfit)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-4 bg-muted/30 border-t border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Total Passiva</span>
                            <span className="font-bold text-lg">{formatIDR(totalLiabilities + totalEquity + netProfit)}</span>
                        </div>
                    </Card>

                    {/* Profit & Loss Details */}
                    <Card className="rounded-xl border-border shadow-sm h-fit">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-serif">Laba Rugi (Profit & Loss)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                <div className="p-4 space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        Pendapatan
                                        <span>{formatIDR(totalRevenue)}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {labaRugi.revenue.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-medium">{formatIDR(a.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3 bg-muted/10">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        Beban-Beban
                                        <span>({formatIDR(totalExpenses)})</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {labaRugi.expenses.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-medium text-error">{formatIDR(a.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-4 bg-accent/5 border-t border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-accent">Laba/Rugi Bersih</span>
                            <span className={`font-bold text-lg ${netProfit >= 0 ? "text-success" : "text-error"}`}>{formatIDR(netProfit)}</span>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
