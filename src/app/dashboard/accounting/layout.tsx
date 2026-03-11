"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BarChart3, Wallet, FileSpreadsheet, TableProperties, Scale } from "lucide-react";

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { id: "journal", label: "Jurnal Umum", href: "/dashboard/accounting/journal", icon: BookOpen },
        { id: "buku-besar", label: "Buku Besar", href: "/dashboard/accounting/buku-besar", icon: FileSpreadsheet },
        { id: "neraca-lajur", label: "Neraca Lajur", href: "/dashboard/accounting/neraca-lajur", icon: TableProperties },
        { id: "neraca", label: "Neraca", href: "/dashboard/accounting/neraca", icon: Scale },
        { id: "reports", label: "Laporan Keuangan", href: "/dashboard/accounting/reports", icon: BarChart3 },
        { id: "accounts", label: "Chart of Accounts", href: "/dashboard/accounting/accounts", icon: Wallet },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-serif text-foreground">Accounting</h1>
                <p className="text-muted-foreground">Kelola pembukuan dan laporan keuangan klien secara otomatis.</p>
            </div>

            <div className="border-b border-border">
                <div className="flex overflow-x-auto gap-8 scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = pathname.startsWith(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {children}
            </div>
        </div>
    );
}
