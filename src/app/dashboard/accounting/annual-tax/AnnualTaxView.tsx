"use client";

import React, { useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BadgeCheck,
    BookOpenCheck,
    Calculator,
    CheckCircle2,
    ClipboardCheck,
    Database,
    FileSpreadsheet,
    GitBranch,
    Landmark,
    ListChecks,
    UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";

type StageKey = "intake" | "classify" | "map" | "review" | "validate" | "export";

interface Stage {
    key: StageKey;
    label: string;
    description: string;
    status: "ready" | "build" | "blocked";
}

interface TaxSection {
    label: string;
    sourceSheets: string;
    websiteModule: string;
    automation: string;
    confidence: "High" | "Medium" | "Low";
}

const stages: Stage[] = [
    {
        key: "intake",
        label: "Upload packet",
        description: "Accept annual workbooks, preserve originals, extract workbook metadata.",
        status: "ready",
    },
    {
        key: "classify",
        label: "Classify sheets",
        description: "Detect SPT forms, source ledgers, reconciliations, and supporting schedules.",
        status: "build",
    },
    {
        key: "map",
        label: "Map values",
        description: "Map each sheet into typed annual tax sections with client and period context.",
        status: "build",
    },
    {
        key: "review",
        label: "Review adjustments",
        description: "Let staff review fiscal corrections, depreciation, credits, and entity splits.",
        status: "build",
    },
    {
        key: "validate",
        label: "Validate return",
        description: "Run accounting, tax, and completeness checks before export.",
        status: "build",
    },
    {
        key: "export",
        label: "Export package",
        description: "Generate internal review pack and final SPT 1771 Excel/PDF output.",
        status: "blocked",
    },
];

const workbookInsights = [
    { label: "Workbooks reviewed", value: "5", detail: "3 .xlsx and 2 legacy .xls" },
    { label: "Detected sheets", value: "151", detail: "SPT forms plus source ledgers" },
    { label: "Core tax form", value: "1771", detail: "Main form and attachments I to VI" },
    { label: "Primary risk", value: "Mapping", detail: "Sheet names vary by client and entity" },
];

const taxSections: TaxSection[] = [
    {
        label: "Company profile and SPT identity",
        sourceSheets: "Data, 1771, 1771 I to VI",
        websiteModule: "Annual Tax Profile",
        automation: "Read NPWP, KPP, company name, period, directors, shareholders, and form status.",
        confidence: "High",
    },
    {
        label: "Financial statements",
        sourceSheets: "neraca, Neraca Lacasetta, NRC Dayu, LABA RUGI FISKAL, LR FISKAL",
        websiteModule: "Financial Statement Review",
        automation: "Normalize balance sheet and P&L lines into report sections already used by accounting.",
        confidence: "High",
    },
    {
        label: "Fiscal reconciliation",
        sourceSheets: "LR FISKAL, Laba Rugi Fiscal, Hit, rugi fiskal",
        websiteModule: "Fiscal Adjustment Builder",
        automation: "Capture commercial amount, positive correction, negative correction, fiscal amount, PKP, and PPh terutang.",
        confidence: "High",
    },
    {
        label: "Depreciation and fixed assets",
        sourceSheets: "penyusutan, amortisasi & penyusutan, daft.pnyusutan, Fix Asset Lacasetta",
        websiteModule: "Depreciation Schedule",
        automation: "Reuse fixed asset model, add commercial versus fiscal depreciation and acquisition period fields.",
        confidence: "High",
    },
    {
        label: "Tax credits and monthly taxes",
        sourceSheets: "Rekap Pajak, Pph 23 masukan, Rekap PPH 26, PPN",
        websiteModule: "Tax Credit Register",
        automation: "Monthly PPh 21, PPh 23, PPh 25, PPh 26, BPJS, PPN in/out, and bupot references.",
        confidence: "Medium",
    },
    {
        label: "VAT source documents",
        sourceSheets: "Faktur masukan, Faktur Keluaran, PEB",
        websiteModule: "VAT Evidence",
        automation: "Import invoice numbers, counterparty NPWP, tax period, DPP, PPN, status, and approval state.",
        confidence: "Medium",
    },
    {
        label: "Working ledgers",
        sourceSheets: "Bank, Bank USD, Bank IDR, kas office, piutang, utang usaha, inventory",
        websiteModule: "Supporting Workpapers",
        automation: "Store as support schedules, reconcile totals to financial statements, avoid posting duplicates.",
        confidence: "Medium",
    },
    {
        label: "Multi-entity breakdowns",
        sourceSheets: "Totem pusat, Bali, Lombok, Lacasetta, Ecolodge",
        websiteModule: "Entity Segment Review",
        automation: "Group source sheets by branch/entity and roll them into one company-level SPT.",
        confidence: "Low",
    },
];

const implementationTasks = [
    "Add annual tax batch tables for workbook, sheet, extracted value, mapped section, and validation issue records.",
    "Build a parser service using the existing xlsx package for .xls/.xlsx extraction and ExcelJS for styled exports.",
    "Create sheet classifiers with aliases such as LR FISKAL, Laba Rugi Fiscal, Rekap Pajak, PPN, Bank, Piutang, and Utang.",
    "Map extracted cells into typed sections instead of raw spreadsheet coordinates.",
    "Add validation rules for balanced neraca, fiscal profit flow, tax credit totals, depreciation tie-outs, and missing SPT attachments.",
    "Export a review workbook first, then the final SPT 1771 packet after approval.",
];

function StatusPill({ status }: { status: Stage["status"] }) {
    const copy = {
        ready: "Ready",
        build: "Build",
        blocked: "Needs decision",
    }[status];
    const color = {
        ready: "bg-success-bg text-success border-success-border",
        build: "bg-info-bg text-info border-info-border",
        blocked: "bg-warning-bg text-warning border-warning-border",
    }[status];

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>
            {copy}
        </span>
    );
}

export function AnnualTaxView() {
    const { selectedClientId } = useSelectedClient();
    const [activeStage, setActiveStage] = useState<StageKey>("intake");

    const selectedStage = useMemo(
        () => stages.find((stage) => stage.key === activeStage) ?? stages[0],
        [activeStage],
    );

    if (!selectedClientId) {
        return (
            <div className="rounded-[16px] border border-dashed border-border bg-muted/20 p-12 text-center">
                <ClipboardCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <h2 className="text-lg font-semibold text-foreground">Pilih klien untuk mulai SPT Tahunan.</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Modul ini menyimpan packet tahunan per klien agar workbook, mapping, review, dan export tidak tercampur antar badan usaha.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[16px] border border-border bg-card p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                            <BookOpenCheck className="h-3.5 w-3.5" />
                            Annual corporate tax workflow
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground">SPT Tahunan workspace</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Convert messy annual Excel packets into a guided review flow: upload, classify, map, validate, and export the SPT 1771 package with supporting schedules.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="soft" className="gap-2">
                            <UploadCloud className="h-4 w-4" />
                            Upload workbook
                        </Button>
                        <Button variant="dark" className="gap-2">
                            Build parser
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {workbookInsights.map((item) => (
                        <div key={item.label} className="rounded-[12px] border border-border bg-surface p-4">
                            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
                <div className="rounded-[16px] border border-border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ListChecks className="h-4 w-4 text-accent" />
                        Workflow
                    </h3>
                    <div className="space-y-2">
                        {stages.map((stage) => {
                            const isActive = stage.key === activeStage;
                            return (
                                <button
                                    key={stage.key}
                                    onClick={() => setActiveStage(stage.key)}
                                    className={`w-full rounded-[10px] border p-3 text-left transition-colors ${
                                        isActive
                                            ? "border-accent bg-accent/5"
                                            : "border-transparent hover:border-border hover:bg-surface"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-foreground">{stage.label}</span>
                                        <StatusPill status={stage.status} />
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[16px] border border-border bg-card">
                    <div className="border-b border-border p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">{selectedStage.label}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{selectedStage.description}</p>
                            </div>
                            <StatusPill status={selectedStage.status} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                        <div className="p-5">
                            <Database className="mb-3 h-5 w-5 text-accent" />
                            <h4 className="text-sm font-semibold text-foreground">Data object</h4>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                One annual tax batch contains workbooks, sheets, extracted tables, mapped fields, validation issues, approvals, and exported files.
                            </p>
                        </div>
                        <div className="p-5">
                            <GitBranch className="mb-3 h-5 w-5 text-accent" />
                            <h4 className="text-sm font-semibold text-foreground">Review pattern</h4>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Staff should review by tax section, not by sheet name. Sheet coordinates stay available as evidence behind each mapped value.
                            </p>
                        </div>
                        <div className="p-5">
                            <BadgeCheck className="mb-3 h-5 w-5 text-accent" />
                            <h4 className="text-sm font-semibold text-foreground">Approval gate</h4>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Export stays locked until all required sections pass validation or are explicitly marked as not applicable.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[16px] border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <FileSpreadsheet className="h-5 w-5 text-accent" />
                        Workbook to product mapping
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        These are the modules the website should expose from the five reviewed workbooks.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Tax section</th>
                                <th className="px-4 py-3 font-semibold">Detected sheets</th>
                                <th className="px-4 py-3 font-semibold">Website module</th>
                                <th className="px-4 py-3 font-semibold">Automation</th>
                                <th className="px-4 py-3 font-semibold">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {taxSections.map((section) => (
                                <tr key={section.label} className="align-top">
                                    <td className="px-4 py-4 font-medium text-foreground">{section.label}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{section.sourceSheets}</td>
                                    <td className="px-4 py-4 text-foreground">{section.websiteModule}</td>
                                    <td className="px-4 py-4 leading-6 text-muted-foreground">{section.automation}</td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                                            {section.confidence}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-[16px] border border-border bg-card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Calculator className="h-5 w-5 text-accent" />
                        Validation rules to implement
                    </h3>
                    <div className="space-y-3">
                        {[
                            "Balance sheet assets must equal liabilities plus equity after current-year profit.",
                            "Fiscal profit in LR FISKAL must flow into Hit and the main 1771 calculation.",
                            "PPh 23, PPh 25, PPh 26, and PPN totals must tie to monthly recap sheets.",
                            "Depreciation expense must tie from fixed asset schedules into fiscal reconciliation.",
                            "Every SPT attachment must be complete, not applicable, or blocked with a reason.",
                        ].map((rule) => (
                            <div key={rule} className="flex gap-3 rounded-[10px] bg-surface p-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                                <p className="text-sm leading-6 text-foreground">{rule}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[16px] border border-border bg-card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Landmark className="h-5 w-5 text-accent" />
                        Implementation path
                    </h3>
                    <div className="space-y-3">
                        {implementationTasks.map((task, index) => (
                            <div key={task} className="flex gap-3">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                                    {index + 1}
                                </span>
                                <p className="text-sm leading-6 text-muted-foreground">{task}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-[16px] border border-warning-border bg-warning-bg p-5">
                <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Important implementation note</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Do not try to reproduce every Excel sheet as a web screen. Use the spreadsheets as evidence and source data, then give staff a section-based review experience with traceability back to workbook, sheet, row, and cell.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
