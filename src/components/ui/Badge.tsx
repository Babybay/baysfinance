"use client";

import React from "react";
import { cn } from "@/components/ui/Button";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
    "inline-flex items-center transition-colors font-medium",
    {
        variants: {
            variant: {
                neutral: "bg-card text-card-foreground border border-border",
                default: "bg-surface text-foreground",
                success: "bg-surface text-muted border border-border",
                warning: "bg-accent-muted text-accent border border-accent/20",
                danger: "bg-error-muted text-error border border-error/20",
                info: "bg-dark-surface/10 text-foreground border border-border",
            },
            size: {
                default: "px-[8px] py-[3px] rounded-[6px] text-[12px] leading-[1.5] tracking-[0.01em]",
            }
        },
        defaultVariants: {
            variant: "neutral",
            size: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, size, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
