"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useI18n } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { locale } = useI18n();
    const id = locale === "id";
    return (
        <div className="grid min-h-dvh lg:grid-cols-2">
            <aside className="cal-auth-art hidden flex-col justify-between p-12 lg:flex xl:p-20">
                <Link href="/" aria-label="CAL home"><Brand className="[&_span_span]:text-[#ffc093]" /></Link>
                <div className="max-w-md py-16">
                    <p className="mb-6 text-xs font-medium uppercase tracking-[.18em] text-[#ffc093]">{id ? "SELAMAT DATANG DI CAL" : "WELCOME TO CAL"}</p>
                    <h2 className="font-serif text-5xl leading-[1.12] tracking-tight">{id ? "Bisnis lebih tenang. Dimulai dari sini." : "A clearer picture. A calmer business."}</h2>
                    <p className="mt-6 leading-7 text-[#d9c9bd]">{id ? "Satu tempat untuk dokumen, tenggat, dan perkembangan layanan Anda." : "One place for your documents, deadlines, and the progress that matters."}</p>
                    <div className="mt-10 space-y-4 text-sm text-[#eaded4]">
                        {(id ? ["Dokumen yang terorganisir", "Informasi layanan yang jelas", "Terhubung dengan konsultan Anda"] : ["Your documents, organized", "Service updates, in view", "Your consulting team, connected"]).map(text => <p key={text} className="flex items-center gap-3"><Check className="h-4 w-4 text-[#ffc093]" />{text}</p>)}
                    </div>
                </div>
                <p className="text-xs text-[#c5ad9a]">CAL · {id ? "Ruang untuk berkembang." : "Space to grow."}</p>
            </aside>
            <div className="flex min-h-dvh flex-col bg-background px-6 py-8 sm:px-12">
                <div className="flex items-center justify-between gap-4"><Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-accent"><ArrowLeft className="h-4 w-4" />{id ? "Kembali ke beranda" : "Back to home"}</Link><LanguageSelector /></div>
                <main className="flex flex-1 items-center justify-center py-16">{children}</main>
                <p className="text-center text-xs text-muted">© {new Date().getFullYear()} CAL</p>
            </div>
        </div>
    );
}
