"use client";

import React, { useState } from "react";
import { cn } from "@/components/ui/Button";

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    return (
        <div className={className}>
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors",
                                activeTab === tab.id
                                    ? "border-accent text-accent"
                                    : "border-transparent text-muted hover:border-secondary hover:text-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="pt-4">
                {tabs.find((tab) => tab.id === activeTab)?.content}
            </div>
        </div>
    );
}
