"use client";

import React, { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, ChevronDown } from "lucide-react";

export function UserMenu() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!session?.user) return null;

    const { name, email } = session.user;
    const role = (session.user as { role?: string }).role || "client";
    const initials = (name || email || "U")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors w-full"
            >
                <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {initials}
                </div>
                <div className="flex-1 text-left min-w-0 hidden sm:block">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute bottom-full left-0 mb-1 w-56 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-border">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">
                            {role}
                        </span>
                    </div>
                    <div className="p-1">
                        <button
                            onClick={() => signOut({ callbackUrl: "/sign-in" })}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-lg hover:bg-muted/50 transition-colors text-error"
                        >
                            <LogOut className="h-4 w-4" />
                            Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Compact version for mobile header */
export function UserMenuCompact() {
    const { data: session } = useSession();

    if (!session?.user) return null;

    const initials = (session.user.name || session.user.email || "U")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold"
            title="Keluar"
        >
            {initials}
        </button>
    );
}
