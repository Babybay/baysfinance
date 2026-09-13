"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/Brand";
import { getStaffPortalUrl } from "@/lib/staff-guide";

export function Footer() {
    const { t, locale } = useI18n();
    return (
        <footer className="border-t border-border bg-[#2c2520] text-[#faf8f5]">
            <div className="cal-container py-14 sm:py-16">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" aria-label="CAL home"><Brand className="text-[#faf8f5] [&_span_span]:text-[#ffc093]" /></Link>
                        <p className="mt-5 max-w-sm text-sm leading-7 text-[#d9c9bd]">{locale === "id" ? "Pajak, akuntansi, dan konsultasi bisnis. Pendampingan yang lebih jelas untuk setiap langkah Anda." : "Tax, accounting, and business consulting. A little more clarity for every step of your journey."}</p>
                        <Link href="/crm/register" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#ffc093] hover:underline">{locale === "id" ? "Mari bicarakan bisnis Anda" : "Let’s talk about your business"}<ArrowUpRight className="h-4 w-4" /></Link>
                    </div>
                    <div>
                        <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#c8ab95]">{t.footer.company}</h3>
                        <ul className="space-y-3 text-sm text-[#eaded4]">
                            <li><Link href="/#services" className="hover:text-white">{t.nav.services}</Link></li>
                            <li><Link href="/#about" className="hover:text-white">{t.nav.about}</Link></li>
                            <li><Link href="/procedures" className="hover:text-white">{t.nav.procedures}</Link></li>
                            <li><Link href="/crm/register" className="hover:text-white">{t.footer.contact}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#c8ab95]">{t.footer.platform}</h3>
                        <ul className="space-y-3 text-sm text-[#eaded4]">
                            <li><Link href="/portal" className="hover:text-white">{t.nav.signUp}</Link></li>
                            <li><Link href="/sign-in" className="hover:text-white">{t.nav.signIn}</Link></li>
                            <li><a href={getStaffPortalUrl()} className="hover:text-white">{t.nav.staffPortal}<ArrowUpRight className="ml-1 inline h-3 w-3" /></a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/15 pt-6 text-xs text-[#c5ad9a] sm:flex-row">
                    <p>© {new Date().getFullYear()} CAL. {t.footer.copyright}</p>
                    <p>{locale === "id" ? "Kejelasan untuk bisnis. Ruang untuk berkembang." : "Clarity for business. Space to grow."}</p>
                </div>
            </div>
        </footer>
    );
}
