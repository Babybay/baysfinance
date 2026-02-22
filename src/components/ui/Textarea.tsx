"use client";

import React from "react";
import { cn } from "@/components/ui/Button";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-foreground">{label}</label>
                )}
                <textarea
                    className={cn(
                        "flex min-h-[80px] w-full rounded-[8px] border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                        error && "border-error focus-visible:ring-error/40",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="text-xs text-error">{error}</p>}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
