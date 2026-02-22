"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en, type Translations } from "@/lib/translations/en";
import { id } from "@/lib/translations/id";

export type Locale = "en" | "id";

const translations: Record<Locale, Translations> = { en, id };

interface I18nContextType {
    locale: Locale;
    t: Translations;
    setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
    locale: "id",
    t: id,
    setLocale: () => { },
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("id");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("pajak_locale") as Locale | null;
        if (saved && (saved === "en" || saved === "id")) {
            setLocaleState(saved);
        }
        setMounted(true);
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem("pajak_locale", newLocale);
        document.documentElement.lang = newLocale;
    }, []);

    const t = translations[locale];

    // Prevent hydration mismatch by rendering default locale on server
    if (!mounted) {
        return (
            <I18nContext.Provider value={{ locale: "id", t: translations["id"], setLocale }}>
                {children}
            </I18nContext.Provider>
        );
    }

    return (
        <I18nContext.Provider value={{ locale, t, setLocale }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}
