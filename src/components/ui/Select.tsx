"use client";

import React from "react";
import { cn } from "@/components/ui/Button";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, placeholder, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-foreground">{label}</label>
                )}
                <select
                    className={cn(
                        "flex h-10 w-full rounded-[8px] border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                        error && "border-error focus-visible:ring-error/40",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-error">{error}</p>}
            </div>
        );
    }
);
Select.displayName = "Select";

export { Select };
