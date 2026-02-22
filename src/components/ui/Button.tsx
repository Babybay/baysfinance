"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                transparent: "bg-transparent text-muted rounded-[8px] border border-transparent hover:bg-surface hover:text-foreground active:scale-[0.97]",
                dark: "bg-dark-surface text-dark-text rounded-[8px] border border-transparent hover:bg-dark-surface-hover active:scale-[0.97]",
                soft: "bg-surface text-foreground rounded-[8px] border border-border hover:bg-border active:scale-[0.97]",
                light: "bg-card text-card-foreground rounded-[8px] border border-border hover:bg-surface active:scale-[0.97]",
                secondary: "bg-dark-surface text-dark-text rounded-[8px] border border-dark-surface-hover hover:bg-dark-surface-hover active:scale-[0.97]",
                accent: "bg-accent text-white rounded-[8px] border border-transparent hover:bg-accent-hover active:scale-[0.97]",
            },
            size: {
                default: "px-[16px] py-[8px] text-[15px] leading-[1.4] tracking-[0.01em]",
                large: "px-[20px] py-[10px] text-[16px] leading-[1.4] tracking-[0.01em]",
                huge: "px-[24px] py-[12px] text-[17px] leading-[1.25] tracking-[0.01em]",
                icon: "h-10 w-10 rounded-[8px]",
            },
        },
        defaultVariants: {
            variant: "dark",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, isLoading, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
