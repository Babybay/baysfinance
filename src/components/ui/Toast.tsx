"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
    duration: number;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: React.ReactNode }> = {
    success: {
        bg: "border-success-border bg-success-bg text-success",
        icon: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
    },
    error: {
        bg: "border-error/30 bg-error-muted text-error",
        icon: <XCircle className="h-5 w-5 text-error shrink-0" />,
    },
    warning: {
        bg: "border-warning-border bg-warning-bg text-warning",
        icon: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
    },
    info: {
        bg: "border-info-border bg-info-bg text-info",
        icon: <Info className="h-5 w-5 text-info shrink-0" />,
    },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const addToast = useCallback((message: string, variant: ToastVariant = "info", duration: number = 4000) => {
        const id = `toast-${++idCounter}`;
        const toast: Toast = { id, message, variant, duration };
        setToasts((prev) => [...prev.slice(-4), toast]); // Keep max 5

        if (duration > 0) {
            const timer = setTimeout(() => removeToast(id), duration);
            timers.current.set(id, timer);
        }
    }, [removeToast]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timers.current.forEach((t) => clearTimeout(t));
        };
    }, []);

    const ctx: ToastContextValue = {
        toast: addToast,
        success: (msg) => addToast(msg, "success", 3000),
        error: (msg) => addToast(msg, "error", 5000),
        warning: (msg) => addToast(msg, "warning", 4000),
        info: (msg) => addToast(msg, "info", 4000),
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            {/* Toast container — fixed bottom-right */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => {
                    const style = VARIANT_STYLES[t.variant];
                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-right-full fade-in duration-300 ${style.bg}`}
                        >
                            {style.icon}
                            <p className="text-sm font-medium flex-1 pt-0.5">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
