"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useI18n } from "@/lib/i18n";

export function Navbar() {
    const { t } = useI18n();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-nav-bg backdrop-blur-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
                <div className="flex items-center gap-[48px]">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="inline-block font-serif text-[22px] tracking-tight text-foreground">
                            PajakConsult
                        </span>
                    </Link>
                    <nav className="hidden md:flex gap-[32px]">
                        <Link href="#features" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.features}
                        </Link>
                        <Link href="#pricing" className="text-[15px] font-medium text-muted hover:text-foreground transition-colors">
                            {t.nav.pricing}
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center justify-end space-x-3">
                    <LanguageSelector />
                    <nav className="flex items-center gap-[12px]">
                        <SignedOut>
                            <Link href="/sign-in">
                                <Button variant="transparent" size="default">{t.nav.signIn}</Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button variant="dark" size="default">{t.nav.signUp}</Button>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard">
                                <Button variant="soft" size="default" className="mr-2">{t.nav.dashboard}</Button>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </nav>
                </div>
            </div>
        </header>
    );
}
