"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { Menu, X } from "lucide-react";

export function Navbar() {
    const { t } = useI18n();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-nav-bg backdrop-blur-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
                <div className="flex items-center gap-[48px]">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="inline-block font-serif text-[22px] tracking-tight text-foreground">
                            Bay&apos;sConsult
                        </span>
                    </Link>
                    <nav className="hidden md:flex gap-[32px]">
                        <Link href="#services" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.services}
                        </Link>
                        <Link href="#features" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.features}
                        </Link>
                        <Link href="#about" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.about}
                        </Link>
                        <Link href="#pricing" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.pricing}
                        </Link>
                        <Link href="/procedures" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.procedures}
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center justify-end space-x-3">
                    <LanguageSelector />
                    <nav className="hidden md:flex items-center gap-[12px]">
                        <SignedOut>
                            <Link href="/sign-in">
                                <Button variant="transparent" size="default">{t.nav.signIn}</Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button variant="accent" size="default">{t.nav.signUp}</Button>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard">
                                <Button variant="soft" size="default" className="mr-2">{t.nav.dashboard}</Button>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 rounded-[8px] text-muted hover:text-foreground hover:bg-surface transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu panel */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-background">
                    <div className="container mx-auto px-4 py-[24px] flex flex-col gap-[16px]">
                        <Link
                            href="#services"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-muted hover:text-foreground transition-colors py-[8px]"
                        >
                            {t.nav.services}
                        </Link>
                        <Link
                            href="#features"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-muted hover:text-foreground transition-colors py-[8px]"
                        >
                            {t.nav.features}
                        </Link>
                        <Link
                            href="#about"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-muted hover:text-foreground transition-colors py-[8px]"
                        >
                            {t.nav.about}
                        </Link>
                        <Link
                            href="#pricing"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-muted hover:text-foreground transition-colors py-[8px]"
                        >
                            {t.nav.pricing}
                        </Link>
                        <Link
                            href="/procedures"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-muted hover:text-foreground transition-colors py-[8px]"
                        >
                            {t.nav.procedures}
                        </Link>

                        <div className="border-t border-border pt-[16px] flex flex-col gap-[12px]">
                            <SignedOut>
                                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                                    <Button variant="soft" size="large" className="w-full">{t.nav.signIn}</Button>
                                </Link>
                                <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                                    <Button variant="accent" size="large" className="w-full">{t.nav.signUp}</Button>
                                </Link>
                            </SignedOut>
                            <SignedIn>
                                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                                    <Button variant="accent" size="large" className="w-full">{t.nav.dashboard}</Button>
                                </Link>
                            </SignedIn>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
