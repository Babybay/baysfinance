"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoles } from "@/lib/hooks/useRoles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
    ChevronLeft, ChevronRight, Check,
    Briefcase, Building2, Plane, Wine, Scale, FileCheck,
    FileText, ClipboardCheck, ArrowLeft,
} from "lucide-react";
import { PermitType, formatIDR } from "@/lib/data";
import { getPermitTypes, createPermitCase } from "@/app/actions/permits";
import { getClients } from "@/app/actions/clients";

const iconMap: Record<string, React.ElementType> = {
    Briefcase, Building2, Plane, Wine, Scale, FileCheck,
};

export default function NewPermitPage() {
    const router = useRouter();
    const { isAdmin } = useRoles();
    const [step, setStep] = useState(0);
    const [permitTypes, setPermitTypes] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedType, setSelectedType] = useState<any | null>(null);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [riskCategory, setRiskCategory] = useState("Low");
    const [feeAmount, setFeeAmount] = useState(0);
    const [notes, setNotes] = useState("");
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

    // IMB/PBG specific state
    const [imbHasBuilding, setImbHasBuilding] = useState<"Sudah" | "Belum" | null>(null);
    const [imbHasDrawing, setImbHasDrawing] = useState<"Sudah" | "Belum" | null>(null);
    const [imbBuildingArea, setImbBuildingArea] = useState("");
    const [imbFloorCount, setImbFloorCount] = useState("");
    const [imbUsage, setImbUsage] = useState("");
    const [imbOwnership, setImbOwnership] = useState<"Sewa" | "Milik Sendiri" | null>(null);

    // Derived states
    const isBuildingPermit = selectedType?.slug === "building";

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [typesRes, clientsRes] = await Promise.all([
            getPermitTypes(),
            getClients(),
        ]);
        if (typesRes.success) setPermitTypes(typesRes.data);
        if (clientsRes.success && clientsRes.data) setClients(clientsRes.data);
        setIsLoading(false);
    };

    const handleToggleCheck = (id: string) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Recalculate dynamic values based on questionnaire
    const getDynamicServiceType = () => {
        if (!isBuildingPermit) return serviceType || selectedType?.name || "";
        if (imbHasBuilding === "Sudah") return "Sertifikat Laik Fungsi (SLF)";
        if (imbHasBuilding === "Belum") return "Persetujuan Bangunan Gedung (PBG) & SLF";
        return serviceType || selectedType?.name || "";
    };

    const getDynamicFee = () => {
        // Just an example placeholder logic for dynamic pricing
        if (!isBuildingPermit) return feeAmount;
        if (imbHasBuilding === "Sudah") return 15000000;
        if (imbHasBuilding === "Belum") return 35000000;
        return feeAmount;
    };

    const getCustomDocs = () => {
        if (!isBuildingPermit) return [];
        const docs = [];
        if (imbOwnership === "Sewa") {
            docs.push("Akte Perjanjian Sewa Menyewa");
        }
        if (imbHasDrawing === "Sudah") {
            docs.push("Gambar Rencana Teknis Terverifikasi");
        }
        return docs;
    };

    const handleSubmit = async () => {
        if (!selectedType || !selectedClientId) return;
        setIsSubmitting(true);

        const client = clients.find(c => c.id === selectedClientId);

        let applicationData = undefined;
        let customDocs: string[] = [];

        if (isBuildingPermit) {
            applicationData = {
                hasBuilding: imbHasBuilding,
                hasDrawing: imbHasDrawing,
                buildingArea: imbHasBuilding === "Belum" && imbHasDrawing === "Belum" ? imbBuildingArea : undefined,
                floorCount: imbHasBuilding === "Belum" && imbHasDrawing === "Belum" ? imbFloorCount : undefined,
                usage: imbHasBuilding === "Belum" && imbHasDrawing === "Belum" ? imbUsage : undefined,
                ownership: imbOwnership,
            };
            customDocs = getCustomDocs();
        }

        const res = await createPermitCase({
            permitTypeId: selectedType.id,
            clientId: selectedClientId,
            clientName: client?.nama || "",
            serviceType: getDynamicServiceType(),
            riskCategory,
            feeAmount: getDynamicFee(),
            notes: notes || undefined,
            applicationData,
            customDocs,
        });

        if (res.success) {
            router.push("/dashboard/permits");
        } else {
            alert("Gagal membuat pengajuan: " + res.error);
        }
        setIsSubmitting(false);
    };

    const allChecklistChecked = selectedType?.checklistItems?.length
        ? selectedType.checklistItems.every((item: any) => checkedItems.has(item.id))
        : true;

    const canProceedStep = () => {
        switch (step) {
            case 0: return !!selectedType;
            case 1:
                if (isBuildingPermit) {
                    if (!imbHasBuilding || !imbOwnership || !imbHasDrawing) return false;
                    if (imbHasDrawing === "Belum") {
                        if (!imbBuildingArea || !imbFloorCount || !imbUsage) return false;
                    }
                    return !!selectedClientId;
                }
                return !!selectedClientId && !!serviceType;
            case 2: return allChecklistChecked;
            case 3: return true;
            default: return false;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    const stepLabels = isBuildingPermit
        ? ["Pilih Jenis", "Kuesioner", "Persetujuan", "Konfirmasi"]
        : ["Pilih Jenis", "Data Klien", "Persetujuan", "Konfirmasi"];

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="soft" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="font-serif text-2xl text-foreground">Pengajuan Perijinan Baru</h1>
                    <p className="text-sm text-muted-foreground mt-1">Ikuti langkah-langkah berikut untuk membuat pengajuan</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="bg-card rounded-[16px] border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    {stepLabels.map((label, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${idx < step ? "bg-accent border-accent text-white" :
                                idx === step ? "bg-card border-accent text-accent" :
                                    "bg-card border-border text-muted"
                                }`}>
                                {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
                            </div>
                            <span className={`text-xs font-medium hidden sm:inline ${idx === step ? "text-accent" : "text-muted-foreground"
                                }`}>{label}</span>
                            {idx < stepLabels.length - 1 && (
                                <div className={`hidden sm:block w-8 h-0.5 ml-2 ${idx < step ? "bg-accent" : "bg-border"}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm min-h-[300px]">
                {/* STEP 0: Select Type */}
                {step === 0 && (
                    <div>
                        <h2 className="font-serif text-lg mb-4">Pilih Jenis Perijinan</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {permitTypes.map((pt) => {
                                const Icon = iconMap[pt.icon || ""] || FileCheck;
                                const isSelected = selectedType?.id === pt.id;
                                return (
                                    <button
                                        key={pt.id}
                                        onClick={() => {
                                            setSelectedType(pt);
                                            setServiceType(pt.name);
                                            setCheckedItems(new Set());

                                            // Reset custom form if changing type
                                            setImbHasBuilding(null);
                                            setImbHasDrawing(null);
                                            setImbBuildingArea("");
                                            setImbFloorCount("");
                                            setImbUsage("");
                                            setImbOwnership(null);
                                        }}
                                        className={`group flex flex-col items-center gap-3 p-5 rounded-[12px] border-2 transition-all duration-200 text-center ${isSelected
                                            ? "border-accent bg-accent-muted"
                                            : "border-border bg-surface hover:border-accent/30 hover:bg-accent-muted/50"
                                            }`}
                                    >
                                        <div className={`h-12 w-12 rounded-[10px] flex items-center justify-center transition-colors ${isSelected ? "bg-accent text-white" : "bg-card border border-border text-muted group-hover:text-accent"
                                            }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${isSelected ? "text-accent" : "text-foreground"}`}>{pt.name}</p>
                                            {pt.description && (
                                                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{pt.description}</p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Badge variant="success" className="text-[10px]">Dipilih</Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedType && (
                            <div className="mt-4 p-3 bg-surface rounded-[8px] border border-border">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">{selectedType.requiredDocs?.length || 0}</span> dokumen wajib •{" "}
                                    <span className="font-semibold text-foreground">{selectedType.checklistItems?.length || 0}</span> item persetujuan •{" "}
                                    Format ID: <span className="font-mono text-accent">{selectedType.caseIdPrefix}-YYYY-MM-NNNN</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 1: Client & Details / Questionnaire */}
                {step === 1 && (
                    <div className="space-y-5">
                        <h2 className="font-serif text-lg">{isBuildingPermit ? "Kuesioner Bangunan & Data Klien" : "Data Klien & Layanan"}</h2>

                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1.5">Klien</label>
                            <select
                                className="w-full bg-surface border border-border rounded-[8px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Pilih klien...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.nama} — {c.npwp}</option>
                                ))}
                            </select>
                        </div>

                        {/* IMB/PBG Specialized Form */}
                        {isBuildingPermit ? (
                            <div className="p-4 bg-accent-muted/20 border border-border rounded-[12px] space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Apakah sudah ada fisik bangunan?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbHasBuilding === "Sudah"} onChange={() => setImbHasBuilding("Sudah")} />
                                            <span className="text-sm">Sudah (Proses SLF)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbHasBuilding === "Belum"} onChange={() => setImbHasBuilding("Belum")} />
                                            <span className="text-sm">Belum (Proses PBG & SLF)</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Status Kepemilikan Lahan?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbOwnership === "Milik Sendiri"} onChange={() => setImbOwnership("Milik Sendiri")} />
                                            <span className="text-sm">Milik Sendiri</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbOwnership === "Sewa"} onChange={() => setImbOwnership("Sewa")} />
                                            <span className="text-sm">Sewa</span>
                                        </label>
                                    </div>
                                    {imbOwnership === "Sewa" && <p className="text-xs text-muted-foreground mt-1">Catatan: Akte Perjanjian Sewa Menyewa wajib dilampirkan nanti.</p>}
                                </div>

                                <div className="pt-2 border-t border-border">
                                    <label className="text-sm font-medium text-foreground block mb-2">Apakah gambar rencana teknis sudah tersedia?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbHasDrawing === "Sudah"} onChange={() => setImbHasDrawing("Sudah")} />
                                            <span className="text-sm">Sudah</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" className="text-accent focus:ring-accent"
                                                checked={imbHasDrawing === "Belum"} onChange={() => setImbHasDrawing("Belum")} />
                                            <span className="text-sm">Belum</span>
                                        </label>
                                    </div>
                                    {imbHasDrawing === "Belum" && (
                                        <div className="mt-4 space-y-3 bg-card p-3 rounded-[8px] border border-border">
                                            <p className="text-xs text-danger font-medium mb-2">Peringatan: Proses tidak dapat dilanjut tanpa gambar. Silakan isi detail berikut untuk estimasi pembuatan gambar.</p>
                                            <Input label="Estimasi Luas Bangunan (m2)" placeholder="Misal: 150" value={imbBuildingArea} onChange={e => setImbBuildingArea(e.target.value)} />
                                            <Input label="Jumlah Lantai" placeholder="Misal: 2" value={imbFloorCount} onChange={e => setImbFloorCount(e.target.value)} />
                                            <Input label="Peruntukan Bangunan" placeholder="Misal: Ruko, Rumah Tinggal" value={imbUsage} onChange={e => setImbUsage(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Standard Form
                            <>
                                <Input
                                    label="Jenis Layanan Spesifik"
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    placeholder="Contoh: NIB Baru, Perpanjangan KITAS, dll."
                                />
                                <Input
                                    label="Biaya Layanan (IDR)"
                                    type="number"
                                    value={String(feeAmount)}
                                    onChange={(e) => setFeeAmount(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </>
                        )}

                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1.5">Kategori Risiko</label>
                            <select
                                className="w-full bg-surface border border-border rounded-[8px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                value={riskCategory}
                                onChange={(e) => setRiskCategory(e.target.value)}
                            >
                                <option value="Low">Rendah (Low)</option>
                                <option value="Medium-Low">Menengah-Rendah (Medium-Low)</option>
                                <option value="Medium-High">Menengah-Tinggi (Medium-High)</option>
                                <option value="High">Tinggi (High)</option>
                            </select>
                        </div>

                        <Textarea
                            label="Catatan Tambahan (Opsional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isBuildingPermit ? "Contoh lokasi tanah..." : "Catatan tambahan untuk advisor..."}
                        />
                    </div>
                )}

                {/* STEP 2: Checklist / Agreement */}
                {step === 2 && selectedType && (
                    <div className="space-y-5">
                        <h2 className="font-serif text-lg">Persetujuan & Persyaratan</h2>
                        <p className="text-sm text-muted-foreground">
                            Centang semua item berikut untuk melanjutkan. Ini merupakan pernyataan persetujuan yang mengikat secara hukum.
                        </p>

                        {/* Required Documents Preview */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-accent" /> Dokumen yang Akan Diperlukan
                            </h3>
                            <div className="space-y-2">
                                {selectedType.requiredDocs?.filter((d: any) => d.docType !== "Gambar Rencana Teknis Terverifikasi").map((doc: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-[8px] bg-surface">
                                        <div className="h-8 w-8 rounded-[6px] bg-card border border-border flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-muted" />
                                        </div>
                                        <span className="text-sm text-foreground">{doc.docType}</span>
                                        {doc.isRequired && <Badge variant="info" className="ml-auto text-[10px]">Wajib</Badge>}
                                    </div>
                                ))}
                                {getCustomDocs().map((docName, idx) => (
                                    <div key={`custom-${idx}`} className="flex items-center gap-3 p-2.5 rounded-[8px] bg-accent-muted/20 border border-accent/20">
                                        <div className="h-8 w-8 rounded-[6px] bg-card border border-border flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-accent" />
                                        </div>
                                        <span className="text-sm text-foreground">{docName}</span>
                                        <Badge variant="warning" className="ml-auto text-[10px]">Wajib (Kondisional)</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Checklist Items */}
                        {selectedType.checklistItems?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-accent" /> Pernyataan Persetujuan
                                </h3>
                                <div className="space-y-3">
                                    {selectedType.checklistItems.map((item: any) => (
                                        <label
                                            key={item.id}
                                            className={`flex items-start gap-3 p-3 rounded-[8px] border-2 cursor-pointer transition-all ${checkedItems.has(item.id)
                                                ? "border-accent bg-accent-muted/50"
                                                : "border-border bg-surface hover:border-accent/30"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checkedItems.has(item.id)}
                                                onChange={() => handleToggleCheck(item.id)}
                                                className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent shrink-0"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Confirmation */}
                {step === 3 && selectedType && (
                    <div className="space-y-5">
                        <h2 className="font-serif text-lg">Konfirmasi Pengajuan</h2>
                        <p className="text-sm text-muted-foreground">Periksa kembali data pengajuan Anda sebelum mengirim.</p>

                        <div className="space-y-3">
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Jenis Perijinan</span>
                                <span className="text-sm font-semibold text-foreground">{selectedType.name}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Format ID</span>
                                <span className="text-sm font-mono text-accent">{selectedType.caseIdPrefix}-YYYY-MM-NNNN</span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Klien</span>
                                <span className="text-sm font-semibold text-foreground">
                                    {clients.find(c => c.id === selectedClientId)?.nama || "-"}
                                </span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Layanan</span>
                                <span className="text-sm font-semibold text-foreground">{getDynamicServiceType()}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Risiko</span>
                                <Badge variant={riskCategory === "High" ? "danger" : riskCategory.includes("Medium") ? "warning" : "success"}>
                                    {riskCategory}
                                </Badge>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Biaya</span>
                                <span className="text-sm font-semibold text-foreground">{formatIDR(getDynamicFee())}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Dokumen</span>
                                <span className="text-sm text-foreground">
                                    {(selectedType.requiredDocs?.length || 0) + getCustomDocs().length - (isBuildingPermit && imbHasDrawing !== "Sudah" ? 1 : 0)} dokumen
                                </span>
                            </div>
                            <div className="flex justify-between p-3 bg-surface rounded-[8px]">
                                <span className="text-sm text-muted-foreground">Persetujuan</span>
                                <Badge variant="success">{checkedItems.size}/{selectedType.checklistItems?.length || 0} disetujui</Badge>
                            </div>
                            {notes && (
                                <div className="p-3 bg-surface rounded-[8px]">
                                    <span className="text-sm text-muted-foreground block mb-1">Catatan</span>
                                    <p className="text-sm text-foreground">{notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="soft"
                    onClick={() => step > 0 ? setStep(step - 1) : router.back()}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {step === 0 ? "Batal" : "Kembali"}
                </Button>

                {step < 3 ? (
                    <Button
                        variant="accent"
                        onClick={() => setStep(step + 1)}
                        disabled={!canProceedStep()}
                    >
                        Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                ) : (
                    <Button
                        variant="accent"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                    >
                        <Check className="h-4 w-4 mr-1" /> Kirim Pengajuan
                    </Button>
                )}
            </div>
        </div>
    );
}
