"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Calculator, Copy, RotateCcw } from "lucide-react";
import { formatIDR, PTKP, PPH21_RATES } from "@/lib/data";

// ============ PPh 21 Calculator ============
function PPh21Calculator() {
    const [gajiPerBulan, setGajiPerBulan] = useState("");
    const [statusPTKP, setStatusPTKP] = useState<keyof typeof PTKP>("TK0");
    const [result, setResult] = useState<{
        gajiSetahun: number;
        ptkp: number;
        pkp: number;
        pphSetahun: number;
        pphPerBulan: number;
        breakdown: { layer: string; taxable: number; rate: number; tax: number }[];
    } | null>(null);

    const calculate = () => {
        const gaji = parseFloat(gajiPerBulan.replace(/[^0-9]/g, "")) || 0;
        const gajiSetahun = gaji * 12;
        const ptkp = PTKP[statusPTKP];
        const pkp = Math.max(0, gajiSetahun - ptkp);

        let remaining = pkp;
        let totalTax = 0;
        const breakdown: { layer: string; taxable: number; rate: number; tax: number }[] = [];

        for (const bracket of PPH21_RATES) {
            if (remaining <= 0) break;
            const bracketSize = bracket.max === Infinity ? remaining : bracket.max - bracket.min;
            const taxable = Math.min(remaining, bracketSize);
            const tax = taxable * bracket.rate;
            totalTax += tax;
            breakdown.push({
                layer: bracket.max === Infinity
                    ? `> ${formatIDR(bracket.min)}`
                    : `${formatIDR(bracket.min)} – ${formatIDR(bracket.max)}`,
                taxable,
                rate: bracket.rate * 100,
                tax,
            });
            remaining -= taxable;
        }

        setResult({
            gajiSetahun,
            ptkp,
            pkp,
            pphSetahun: totalTax,
            pphPerBulan: Math.round(totalTax / 12),
            breakdown,
        });
    };

    const reset = () => {
        setGajiPerBulan("");
        setStatusPTKP("TK0");
        setResult(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Input Data PPh 21</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Gaji Bruto per Bulan (Rp)"
                        type="text"
                        value={gajiPerBulan}
                        onChange={(e) => setGajiPerBulan(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="10000000"
                    />
                    <Select
                        label="Status PTKP"
                        value={statusPTKP}
                        onChange={(e) => setStatusPTKP(e.target.value as keyof typeof PTKP)}
                        options={[
                            { value: "TK0", label: "TK/0 - Tidak Kawin, Tanpa Tanggungan" },
                            { value: "TK1", label: "TK/1 - Tidak Kawin, 1 Tanggungan" },
                            { value: "TK2", label: "TK/2 - Tidak Kawin, 2 Tanggungan" },
                            { value: "TK3", label: "TK/3 - Tidak Kawin, 3 Tanggungan" },
                            { value: "K0", label: "K/0 - Kawin, Tanpa Tanggungan" },
                            { value: "K1", label: "K/1 - Kawin, 1 Tanggungan" },
                            { value: "K2", label: "K/2 - Kawin, 2 Tanggungan" },
                            { value: "K3", label: "K/3 - Kawin, 3 Tanggungan" },
                        ]}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button onClick={calculate}><Calculator className="h-4 w-4 mr-2" /> Hitung PPh 21</Button>
                    <Button variant="transparent" className="border border-border text-slate-700 bg-white" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
                </div>
            </div>

            {result && (
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Hasil Perhitungan PPh 21</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Gaji Setahun</p>
                            <p className="font-bold text-slate-900">{formatIDR(result.gajiSetahun)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">PTKP ({statusPTKP})</p>
                            <p className="font-bold text-slate-900">{formatIDR(result.ptkp)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">PKP</p>
                            <p className="font-bold text-slate-900">{formatIDR(result.pkp)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600">PPh 21 / Bulan</p>
                            <p className="font-bold text-blue-700 text-lg">{formatIDR(result.pphPerBulan)}</p>
                        </div>
                    </div>

                    <h4 className="text-sm font-medium text-slate-700 mb-2">Rincian Tarif Progresif (Pasal 17)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    <th className="text-left px-3 py-2 font-medium text-slate-600">Lapisan</th>
                                    <th className="text-right px-3 py-2 font-medium text-slate-600">PKP Kena Tarif</th>
                                    <th className="text-right px-3 py-2 font-medium text-slate-600">Tarif</th>
                                    <th className="text-right px-3 py-2 font-medium text-slate-600">Pajak</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.breakdown.map((b, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-3 py-2 text-slate-600">{b.layer}</td>
                                        <td className="px-3 py-2 text-right">{formatIDR(b.taxable)}</td>
                                        <td className="px-3 py-2 text-right">{b.rate}%</td>
                                        <td className="px-3 py-2 text-right font-medium">{formatIDR(b.tax)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-blue-50">
                                    <td colSpan={3} className="px-3 py-2 font-semibold">Total PPh 21 Setahun</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-700">{formatIDR(result.pphSetahun)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ PPh 23 Calculator ============
function PPh23Calculator() {
    const [jumlahBruto, setJumlahBruto] = useState("");
    const [tarif, setTarif] = useState("2");
    const [result, setResult] = useState<{ bruto: number; tarif: number; pph: number } | null>(null);

    const calculate = () => {
        const bruto = parseFloat(jumlahBruto.replace(/[^0-9]/g, "")) || 0;
        const rate = parseFloat(tarif) / 100;
        setResult({ bruto, tarif: parseFloat(tarif), pph: bruto * rate });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Input Data PPh 23</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Jumlah Bruto (Rp)"
                        type="text"
                        value={jumlahBruto}
                        onChange={(e) => setJumlahBruto(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="50000000"
                    />
                    <Select
                        label="Tarif PPh 23"
                        value={tarif}
                        onChange={(e) => setTarif(e.target.value)}
                        options={[
                            { value: "2", label: "2% - Jasa Teknik, Manajemen, Konsultasi, dll." },
                            { value: "15", label: "15% - Dividen, Bunga, Royalti" },
                        ]}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button onClick={calculate}><Calculator className="h-4 w-4 mr-2" /> Hitung PPh 23</Button>
                    <Button variant="transparent" className="border border-border text-slate-700 bg-white" onClick={() => { setJumlahBruto(""); setResult(null); }}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
                </div>
            </div>
            {result && (
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-semibold mb-4">Hasil Perhitungan PPh 23</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Jumlah Bruto</p>
                            <p className="font-bold">{formatIDR(result.bruto)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Tarif</p>
                            <p className="font-bold">{result.tarif}%</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600">PPh 23 Terutang</p>
                            <p className="font-bold text-blue-700 text-lg">{formatIDR(result.pph)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ PPN Calculator ============
function PPNCalculator() {
    const [dpp, setDpp] = useState("");
    const [tipe, setTipe] = useState<"exclusive" | "inclusive">("exclusive");
    const [result, setResult] = useState<{ dpp: number; ppn: number; total: number } | null>(null);

    const calculate = () => {
        const amount = parseFloat(dpp.replace(/[^0-9]/g, "")) || 0;
        if (tipe === "exclusive") {
            const ppn = amount * 0.11;
            setResult({ dpp: amount, ppn, total: amount + ppn });
        } else {
            const dppCalc = amount / 1.11;
            const ppn = amount - dppCalc;
            setResult({ dpp: Math.round(dppCalc), ppn: Math.round(ppn), total: amount });
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Input Data PPN (11%)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label={tipe === "exclusive" ? "DPP / Harga Sebelum PPN (Rp)" : "Harga Termasuk PPN (Rp)"}
                        type="text"
                        value={dpp}
                        onChange={(e) => setDpp(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="100000000"
                    />
                    <Select
                        label="Tipe Perhitungan"
                        value={tipe}
                        onChange={(e) => setTipe(e.target.value as "exclusive" | "inclusive")}
                        options={[
                            { value: "exclusive", label: "PPN Eksklusif (harga belum termasuk PPN)" },
                            { value: "inclusive", label: "PPN Inklusif (harga sudah termasuk PPN)" },
                        ]}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button onClick={calculate}><Calculator className="h-4 w-4 mr-2" /> Hitung PPN</Button>
                    <Button variant="transparent" className="border border-border text-slate-700 bg-white" onClick={() => { setDpp(""); setResult(null); }}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
                </div>
            </div>
            {result && (
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-semibold mb-4">Hasil Perhitungan PPN</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">DPP</p>
                            <p className="font-bold">{formatIDR(result.dpp)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600">PPN 11%</p>
                            <p className="font-bold text-blue-700 text-lg">{formatIDR(result.ppn)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Total (DPP + PPN)</p>
                            <p className="font-bold">{formatIDR(result.total)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ PPh Final UMKM Calculator ============
function PPhFinalUMKMCalculator() {
    const [omzet, setOmzet] = useState("");
    const [result, setResult] = useState<{ omzet: number; tarif: number; pph: number } | null>(null);

    const calculate = () => {
        const amount = parseFloat(omzet.replace(/[^0-9]/g, "")) || 0;
        setResult({ omzet: amount, tarif: 0.5, pph: amount * 0.005 });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Input Data PPh Final UMKM (PP 55/2022)</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                    <strong>Catatan:</strong> Tarif PPh Final UMKM sebesar 0,5% berlaku untuk WP dengan omzet bruto ≤ Rp 4,8 miliar per tahun. WP Orang Pribadi dengan omzet ≤ Rp 500 juta per tahun tidak dikenai pajak (PP 55/2022).
                </div>
                <Input
                    label="Omzet Bruto per Bulan (Rp)"
                    type="text"
                    value={omzet}
                    onChange={(e) => setOmzet(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="100000000"
                />
                <div className="flex gap-3 mt-4">
                    <Button onClick={calculate}><Calculator className="h-4 w-4 mr-2" /> Hitung PPh Final</Button>
                    <Button variant="transparent" className="border border-border text-slate-700 bg-white" onClick={() => { setOmzet(""); setResult(null); }}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
                </div>
            </div>
            {result && (
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-semibold mb-4">Hasil Perhitungan PPh Final UMKM</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Omzet Bruto</p>
                            <p className="font-bold">{formatIDR(result.omzet)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Tarif PPh Final</p>
                            <p className="font-bold">{result.tarif}%</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600">PPh Final Terutang</p>
                            <p className="font-bold text-blue-700 text-lg">{formatIDR(result.pph)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ Main Calculator Page ============
export default function TaxCalculatorPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Kalkulator Pajak</h1>
                <p className="text-sm text-slate-500 mt-1">Hitung pajak sesuai peraturan perpajakan Indonesia</p>
            </div>

            <Tabs
                tabs={[
                    { id: "pph21", label: "PPh 21", content: <PPh21Calculator /> },
                    { id: "pph23", label: "PPh 23", content: <PPh23Calculator /> },
                    { id: "ppn", label: "PPN", content: <PPNCalculator /> },
                    { id: "pphfinal", label: "PPh Final UMKM", content: <PPhFinalUMKMCalculator /> },
                ]}
            />
        </div>
    );
}
