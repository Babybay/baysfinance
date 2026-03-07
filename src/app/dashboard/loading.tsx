import React from "react";

export default function DashboardLoading() {
    return (
        <div className="animate-pulse">
            {/* ── Greeting Skeleton ──────────────────────────────────── */}
            <div className="mb-8">
                <div className="h-8 w-64 bg-border rounded-md mb-2"></div>
                <div className="h-4 w-48 bg-border/50 rounded-md"></div>
            </div>

            {/* ── KPI Strip Skeleton ────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card rounded-[16px] border border-border p-5 h-32">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-3 w-24 bg-border rounded"></div>
                            <div className="h-8 w-8 bg-border/50 rounded-[8px]"></div>
                        </div>
                        <div className="h-6 w-32 bg-border rounded mb-2"></div>
                        <div className="h-3 w-20 bg-border/50 rounded"></div>
                    </div>
                ))}
            </div>

            {/* ── Quick Actions Skeleton ─────────────────────────────── */}
            <div className="flex flex-wrap gap-3 mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-32 bg-border/50 rounded-[8px]"></div>
                ))}
            </div>

            {/* ── Two-column Feed Skeleton ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-card rounded-[16px] border border-border p-6 h-96">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-5 w-48 bg-border rounded"></div>
                            <div className="h-4 w-16 bg-border/50 rounded"></div>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((j) => (
                                <div key={j} className="h-16 w-full bg-surface rounded-[8px]"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
