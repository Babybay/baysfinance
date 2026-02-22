"use client";

import React from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/components/ui/Button";

export function LanguageSelector() {
    const { locale, setLocale, t } = useI18n();

    return (
        <div className="flex items-center rounded-[8px] border border-border bg-card overflow-hidden text-[13px]">
            <button
                onClick={() => setLocale("en")}
                className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    locale === "en"
                        ? "bg-accent text-white"
                        : "text-muted hover:text-foreground hover:bg-surface"
                )}
            >
                EN
            </button>
            <div className="w-px h-5 bg-border" />
            <button
                onClick={() => setLocale("id")}
                className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    locale === "id"
                        ? "bg-accent text-white"
                        : "text-muted hover:text-foreground hover:bg-surface"
                )}
            >
                ID
            </button>
        </div>
    );
}
