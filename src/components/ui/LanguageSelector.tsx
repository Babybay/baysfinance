"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/components/ui/Button";

export function LanguageSelector() {
    const { locale, setLocale } = useI18n();

    return (
        <div className="flex items-center rounded-[8px] border border-border bg-card overflow-hidden text-[13px]">
            <button
                type="button"
                aria-label="English"
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
                className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    locale === "en"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:text-foreground hover:bg-surface"
                )}
            >
                EN
            </button>
            <div className="w-px h-5 bg-border" />
            <button
                type="button"
                aria-label="Bahasa Indonesia"
                aria-pressed={locale === "id"}
                onClick={() => setLocale("id")}
                className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    locale === "id"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:text-foreground hover:bg-surface"
                )}
            >
                ID
            </button>
        </div>
    );
}
