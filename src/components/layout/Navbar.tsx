"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { buttonVariants } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { UserMenu } from "@/components/auth/UserMenu";
import { useI18n } from "@/lib/i18n";
import { getStaffPortalUrl } from "@/lib/staff-guide";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function Navbar() {
    const { t, locale } = useI18n();
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const links = [
        { href: "/#services", label: t.nav.services },
        { href: "/#features", label: locale === "id" ? "Cara kerja" : "How it works" },
        { href: "/#about", label: t.nav.about },
        { href: "/procedures", label: t.nav.procedures },
    ];
    useEffect(() => {
        if (!mobileOpen) return;
        const close = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setMobileOpen(false); toggleRef.current?.focus(); }
        };
        document.addEventListener("keydown", close);
        return () => document.removeEventListener("keydown", close);
    }, [mobileOpen]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-nav-bg backdrop-blur-xl">
            <div className="cal-container flex h-20 items-center justify-between gap-6">
                <Link href="/" aria-label="CAL home" className="shrink-0 text-foreground"><Brand /></Link>
                <nav aria-label={locale === "id" ? "Navigasi utama" : "Main navigation"} className="hidden items-center gap-7 xl:flex">
                    {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className="text-[13px] font-medium text-muted transition-colors hover:text-accent">{link.label}</Link>)}
                </nav>
                <div className="flex items-center gap-3">
                    <LanguageSelector />
                    <div className="hidden items-center gap-3 xl:flex">
                        <a href={getStaffPortalUrl()} className="px-2 text-xs font-medium text-muted hover:text-accent">{t.nav.staffPortal}<ArrowUpRight className="ml-1 inline h-3 w-3" /></a>
                        {session ? <><Link href="/dashboard" className={buttonVariants({ variant: "accent", className: "text-sm" })}>{t.nav.dashboard}</Link><UserMenu /></> : <Link href="/portal" className={buttonVariants({ variant: "accent", className: "gap-2 text-sm" })}>{t.nav.signUp}<ArrowUpRight className="h-4 w-4" /></Link>}
                    </div>
                    <button ref={toggleRef} type="button" className="rounded-lg p-2 text-foreground hover:bg-surface xl:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? (locale === "id" ? "Tutup menu" : "Close menu") : (locale === "id" ? "Buka menu" : "Open menu")} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>
            {mobileOpen && <nav id="mobile-navigation" aria-label={locale === "id" ? "Navigasi seluler" : "Mobile navigation"} className="max-h-[calc(100dvh-80px)] overflow-y-auto border-t border-border bg-card px-6 py-5 xl:hidden">
                {links.map(link => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-muted hover:bg-surface hover:text-accent">{link.label}</Link>)}
                <div className="mt-4 grid gap-3 border-t border-border pt-5">
                    <Link href={session ? "/dashboard" : "/portal"} onClick={() => setMobileOpen(false)} className={buttonVariants({ variant: "accent", size: "large" })}>{session ? t.nav.dashboard : t.nav.signUp}</Link>
                    {!session && <Link href="/sign-in" onClick={() => setMobileOpen(false)} className={buttonVariants({ variant: "light", size: "large" })}>{t.nav.signIn}</Link>}
                    <a href={getStaffPortalUrl()} className="py-3 text-center text-sm text-muted hover:text-accent">{t.nav.staffPortal}<ArrowUpRight className="ml-1 inline h-4 w-4" /></a>
                </div>
            </nav>}
        </header>
    );
}
