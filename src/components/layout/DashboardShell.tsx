"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/lib/hooks/useRoles";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Calculator,
    FileText,
    Receipt,
    BarChart3,
    FileCheck,
    Menu,
    X,
    ChevronLeft,
} from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { t } = useI18n();
    const { role, isLoaded } = useRoles();

    const sidebarLinks = [
        { href: "/dashboard", label: t.sidebar.dashboard, icon: LayoutDashboard, roles: ["admin", "client"] },
        { href: "/dashboard/clients", label: t.sidebar.clients, icon: Users, roles: ["admin"] },
        { href: "/dashboard/tax-calendar", label: t.sidebar.taxCalendar, icon: CalendarDays, roles: ["admin", "client"] },
        { href: "/dashboard/permits", label: t.sidebar.permits, icon: FileCheck, roles: ["admin", "client"] },
        { href: "/dashboard/tax-calculator", label: t.sidebar.taxCalculator, icon: Calculator, roles: ["admin"] },
        { href: "/dashboard/documents", label: t.sidebar.documents, icon: FileText, roles: ["admin", "client"] },
        { href: "/dashboard/invoices", label: t.sidebar.invoices, icon: Receipt, roles: ["admin", "client"] },
        { href: "/dashboard/reports", label: t.sidebar.reports, icon: BarChart3, roles: ["admin"] },
        { href: "/dashboard/users", label: t.sidebar.userManagement, icon: Users, roles: ["admin"] },
    ].filter(link => role && link.roles.includes(role));

    if (!isLoaded) {
        return <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>;
    }

    return (
        <div className="min-h-screen flex bg-surface">
            {sidebarOpen && (
                <div className="fixed inset-0 bg-overlay z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
                    <Link href="/" className="font-serif text-lg tracking-tight text-foreground">Bay&apos;sConsult</Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-[8px] hover:bg-surface">
                        <X className="h-5 w-5 text-muted" />
                    </button>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {sidebarLinks.map((link) => {
                        const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-colors ${isActive ? "bg-accent-muted text-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>
                                <link.icon className={`h-5 w-5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border px-4 py-3 shrink-0 space-y-3">
                    <LanguageSelector />
                    <div className="flex items-center gap-3">
                        <UserButton afterSignOutUrl="/" />
                        <div className="text-sm font-medium text-foreground">{t.sidebar.myAccount}</div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-[8px] hover:bg-surface">
                        <Menu className="h-5 w-5 text-muted" />
                    </button>
                    <div className="hidden lg:block">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            <ChevronLeft className="h-4 w-4" /> {t.sidebar.backToHome}
                        </Link>
                    </div>
                    <div className="lg:hidden">
                        <span className="font-serif text-foreground">Bay&apos;sConsult</span>
                    </div>
                    <div className="lg:hidden">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
