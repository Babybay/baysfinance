"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Lock, Shield, Globe, Mail } from "lucide-react";

export function Footer() {
    const { t } = useI18n();

    return (
        <footer className="border-t border-border bg-foreground text-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-[72px]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[48px]">
                    <div className="col-span-2">
                        <Link href="/" className="inline-block font-serif text-[22px] tracking-tight text-background mb-[24px]">
                            Bay&apos;sConsult
                        </Link>
                        <p className="text-[15px] leading-[1.6] text-muted-foreground max-w-[300px] mb-[24px]">
                            {t.footer.description}
                        </p>
                        {/* Security badge */}
                        <div className="flex items-center gap-[8px] text-muted-foreground">
                            <Lock className="h-4 w-4 text-accent" />
                            <span className="text-[13px]">{t.footer.security}</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-medium text-[14px] mb-[24px] text-secondary uppercase tracking-[0.5px]">{t.footer.platform}</h3>
                        <ul className="space-y-[16px]">
                            <li><Link href="#services" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.nav.services}</Link></li>
                            <li><Link href="#features" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.nav.features}</Link></li>
                            <li><Link href="#pricing" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.nav.pricing}</Link></li>
                            <li><Link href="/dashboard" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.nav.dashboard}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-medium text-[14px] mb-[24px] text-secondary uppercase tracking-[0.5px]">{t.footer.company}</h3>
                        <ul className="space-y-[16px]">
                            <li><Link href="#about" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.nav.about}</Link></li>
                            <li><Link href="/privacy" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.footer.privacy}</Link></li>
                            <li><Link href="/terms" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.footer.terms}</Link></li>
                            <li><Link href="/contact" className="text-[15px] text-muted-foreground hover:text-background transition-colors">{t.footer.contact}</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-[72px] pt-[32px] border-t border-muted-foreground/20 flex flex-col md:flex-row justify-between items-center gap-[16px]">
                    <p className="text-[12px] text-muted-foreground">
                        © {new Date().getFullYear()} Bay&apos;sConsult. {t.footer.copyright}
                    </p>
                    <div className="flex gap-[24px]">
                        <Globe className="h-5 w-5 text-muted-foreground hover:text-background cursor-pointer transition-colors" />
                        <Mail className="h-5 w-5 text-muted-foreground hover:text-background cursor-pointer transition-colors" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
