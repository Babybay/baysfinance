"use client";

import React from "react";
import { cn } from "@/components/ui/Button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, type, ...props }, ref) => {
        const generatedId = React.useId();
        const inputId = props.id ?? generatedId;
        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-foreground">{label}</label>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-[8px] border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                        error && "border-error focus-visible:ring-error/40",
                        className
                    )}
                    ref={ref}
                    {...props}
                    id={inputId}
                    aria-invalid={error ? true : props["aria-invalid"]}
                    aria-describedby={[props["aria-describedby"], error ? `${inputId}-error` : null].filter(Boolean).join(" ") || undefined}
                />
                {error && <p id={`${inputId}-error`} className="text-xs text-error">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
