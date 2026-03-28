"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BookOpen, BarChart3, Wallet, FileSpreadsheet, TableProperties,
    Scale, FileText, Upload, MinusCircle, TrendingDown, Clock,
    Calculator, PieChart, Building2,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useRoles } from "@/lib/hooks/useRoles";
import {
    SelectedClientProvider,
    useSelectedClient,
    type ClientOption,
} from "@/lib/hooks/useSelectedClient";

// ── Tab configuration with groups ────────────────────────────────────────────

interface TabGroup {
    label: string;
    tabs: { id: string; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const TAB_GROUPS: TabGroup[] = [
    {
        label: "Setup",
        tabs: [
            { id: "accounts", label: "Chart of Accounts", href: "/dashboard/accounting/accounts", icon: Wallet },
            { id: "import", label: "Import", href: "/dashboard/accounting/import", icon: Upload },
        ],
    },
    {
        label: "Input",
        tabs: [
            { id: "journal", label: "Jurnal Umum", href: "/dashboard/accounting/journal", icon: BookOpen },
            { id: "expenses", label: "Beban", href: "/dashboard/accounting/expenses", icon: MinusCircle },
            { id: "depreciation", label: "Penyusutan", href: "/dashboard/accounting/depreciation", icon: Calculator },
        ],
    },
    {
        label: "Laporan",
        tabs: [
            { id: "buku-besar", label: "Buku Besar", href: "/dashboard/accounting/buku-besar", icon: FileSpreadsheet },
            { id: "neraca-lajur", label: "Neraca Lajur", href: "/dashboard/accounting/neraca-lajur", icon: TableProperties },
            { id: "neraca", label: "Neraca", href: "/dashboard/accounting/neraca", icon: Scale },
            { id: "ekuitas", label: "Ekuitas", href: "/dashboard/accounting/ekuitas", icon: PieChart },
            { id: "reports", label: "Laporan Keuangan", href: "/dashboard/accounting/reports", icon: BarChart3 },
        ],
    },
    {
        label: "Operasi",
        tabs: [
            { id: "aging", label: "Aging", href: "/dashboard/accounting/aging", icon: Clock },
            { id: "fiscal-close", label: "Tutup Buku", href: "/dashboard/accounting/fiscal-close", icon: TrendingDown },
            { id: "documents", label: "Dokumen", href: "/dashboard/accounting/documents", icon: FileText },
        ],
    },
];

// ── Client Selector (shown in header for admin/staff) ────────────────────────

function GlobalClientSelector() {
    const { isClient } = useRoles();
    const { selectedClientId, setSelectedClientId, clients } = useSelectedClient();

    if (isClient) return null;

    return (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                options={clients.map((c) => ({
                    value: c.id,
                    label: c.nama,
                }))}
                placeholder="Pilih Klien..."
            />
        </div>
    );
}

// ── Tab Bar ──────────────────────────────────────────────────────────────────

function AccountingTabs() {
    const pathname = usePathname();

    return (
        <div className="border-b border-border">
            <div className="flex overflow-x-auto gap-1 scrollbar-hide">
                {TAB_GROUPS.map((group, gi) => (
                    <React.Fragment key={group.label}>
                        {gi > 0 && (
                            <div className="self-stretch w-px bg-border my-2 mx-1 flex-shrink-0" />
                        )}
                        {group.tabs.map((tab) => {
                            const isActive = pathname.startsWith(tab.href);
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                        isActive
                                            ? "border-accent text-accent"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ── Main Layout ──────────────────────────────────────────────────────────────

export function AccountingLayoutClient({
    children,
    clients,
}: {
    children: React.ReactNode;
    clients: ClientOption[];
}) {
    return (
        <SelectedClientProvider clients={clients}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-serif text-foreground">Accounting</h1>
                        <p className="text-muted-foreground">Kelola pembukuan dan laporan keuangan klien secara otomatis.</p>
                    </div>
                    <GlobalClientSelector />
                </div>

                <AccountingTabs />

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {children}
                </div>
            </div>
        </SelectedClientProvider>
    );
}
