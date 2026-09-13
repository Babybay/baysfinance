"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { usePathname } from "next/navigation";
import { UserMenu, UserMenuCompact } from "@/components/auth/UserMenu";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/lib/hooks/useRoles";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import {
    LayoutDashboard,
    CalendarDays,
    FileText,
    Receipt,
    FileCheck,
    Menu,
    X,
    ChevronLeft,

    GraduationCap,
} from "lucide-react";


export function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { t, locale } = useI18n();
    const menuRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!sidebarOpen) return;
        const close = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setSidebarOpen(false); menuRef.current?.focus(); }
        };
        document.addEventListener("keydown", close);
        return () => document.removeEventListener("keydown", close);
    }, [sidebarOpen]);
    const { role } = useRoles();

    const sidebarLinks = [
        { href: "/dashboard", label: t.sidebar.dashboard, icon: LayoutDashboard, roles: ["client"] },
        { href: "/dashboard/tax-calendar", label: t.sidebar.taxCalendar, icon: CalendarDays, roles: ["client"] },
        { href: "/dashboard/permits", label: t.sidebar.permits, icon: FileCheck, roles: ["client"] },
        { href: "/dashboard/documents", label: t.sidebar.documents, icon: FileText, roles: ["client"] },
        { href: "/dashboard/invoices", label: t.sidebar.invoices, icon: Receipt, roles: ["client"] },
        { href: "/dashboard/erpnext-guide", label: t.sidebar.erpnextGuide, icon: GraduationCap, roles: ["admin", "staff"] },
    ].filter(link => role && link.roles.includes(role));

    // Loading state is now handled by Next.js layouts and server components

    return (
        <div className="min-h-screen flex bg-surface">
            {sidebarOpen && (
                <div className="fixed inset-0 bg-overlay z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside id="dashboard-sidebar" data-shell-sidebar className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="h-20 flex items-center justify-between px-5 border-b border-border shrink-0">
                    <Link href="/" aria-label="CAL home" className="text-foreground"><Brand /></Link>
                    <button aria-label={locale === "id" ? "Tutup navigasi" : "Close navigation"} onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-[8px] hover:bg-surface">
                        <X className="h-5 w-5 text-muted" />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <p className="px-3 pb-4 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{locale === "id" ? "Ruang kerja Anda" : "Your workspace"}</p>
                    {sidebarLinks.map((link) => {
                        const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} aria-current={isActive ? "page" : undefined} href={link.href} onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:bg-surface hover:text-foreground"}`}>
                                <link.icon className={`h-5 w-5 ${isActive ? "text-accent-foreground" : "text-muted-foreground"}`} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border px-4 py-3 shrink-0 space-y-3">
                    <LanguageSelector />
                    <UserMenu />
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
                    <button ref={menuRef} aria-label={locale === "id" ? "Buka navigasi" : "Open navigation"} aria-expanded={sidebarOpen} aria-controls="dashboard-sidebar" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-[8px] hover:bg-surface">
                        <Menu className="h-5 w-5 text-muted" />
                    </button>
                    <div className="hidden lg:block">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            <ChevronLeft className="h-4 w-4" /> {t.sidebar.backToHome}
                        </Link>
                    </div>
                    <div className="lg:hidden">
                        <Brand />
                    </div>
                    <div className="lg:hidden">
                        <UserMenuCompact />
                    </div>
                </header>

                <main id="main-content" data-shell-content className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
