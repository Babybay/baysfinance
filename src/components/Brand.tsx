import { cn } from "@/components/ui/Button";

export function Brand({ className }: { className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 shrink-0" fill="none">
                <path d="M25 7H14a9 9 0 0 0 0 18h11" stroke="currentColor" strokeWidth="4" />
                <path d="M25 14H15v4h10" fill="currentColor" />
            </svg>
            <span className="font-sans text-[27px] font-semibold tracking-[-0.06em] leading-none">CAL<span className="text-accent">.</span></span>
        </span>
    );
}
