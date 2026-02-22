"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
            <div
                className={`relative bg-card rounded-[16px] shadow-[var(--shadow-color)_0px_4px_24px_0px] border border-border w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-[8px] hover:bg-surface transition-colors"
                    >
                        <X className="h-5 w-5 text-muted" />
                    </button>
                </div>
                <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
            </div>
        </div>
    );
}
