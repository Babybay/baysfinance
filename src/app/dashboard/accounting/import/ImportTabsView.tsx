"use client";

import React, { useState } from "react";
import { FileSpreadsheet, FolderUp, History, Upload, ScanLine } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Client } from "@/lib/data";
import { ImportView } from "./ImportView";
import { TemplateUploadView } from "./TemplateUploadView";
import { InvoiceScanView } from "./InvoiceScanView";

interface ImportTabsViewProps {
    clients: Client[];
    defaultClientId: string;
    isClientRole: boolean;
}

type Tab = "template" | "batch" | "document" | "scan";

export function ImportTabsView({ clients, defaultClientId, isClientRole }: ImportTabsViewProps) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>("template");

    const ti = t?.accounting?.import;

    const tabs: { key: Tab; label: string; icon: React.ReactNode; description: string }[] = [
        {
            key: "template",
            label: "Template Upload",
            icon: <FileSpreadsheet className="h-4 w-4" />,
            description: "Upload template Excel standar (10 sheet)",
        },
        {
            key: "batch",
            label: "Batch Upload",
            icon: <FolderUp className="h-4 w-4" />,
            description: "Upload banyak file sekaligus",
        },
        {
            key: "document",
            label: ti?.autoDetected ?? "Auto-Detect",
            icon: <Upload className="h-4 w-4" />,
            description: "Upload dokumen & deteksi otomatis",
        },
        {
            key: "scan",
            label: "Scan Faktur",
            icon: <ScanLine className="h-4 w-4" />,
            description: "Scan faktur/invoice dari gambar atau PDF menggunakan OCR",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div />
                <Link
                    href="/dashboard/accounting/import/history"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <History className="h-4 w-4" />
                    {ti?.history ?? "Riwayat Import"}
                </Link>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === tab.key
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab description */}
            <p className="text-sm text-muted-foreground">
                {tabs.find((t) => t.key === activeTab)?.description}
            </p>

            {/* Tab content */}
            {activeTab === "template" && (
                <TemplateUploadView
                    clients={clients}
                    defaultClientId={defaultClientId}
                    isClientRole={isClientRole}
                    mode="single"
                />
            )}

            {activeTab === "batch" && (
                <TemplateUploadView
                    clients={clients}
                    defaultClientId={defaultClientId}
                    isClientRole={isClientRole}
                    mode="batch"
                />
            )}

            {activeTab === "document" && (
                <ImportView
                    clients={clients}
                    defaultClientId={defaultClientId}
                    isClientRole={isClientRole}
                />
            )}

            {activeTab === "scan" && (
                <InvoiceScanView
                    clients={clients}
                    defaultClientId={defaultClientId}
                    isClientRole={isClientRole}
                />
            )}
        </div>
    );
}
