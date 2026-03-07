import React from "react";

export default function SubpageLoading() {
    return (
        <div className="w-full flex flex-col gap-6 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <div>
                    <div className="h-8 bg-border rounded-md w-48 mb-2"></div>
                    <div className="h-4 bg-border/50 rounded-md w-64"></div>
                </div>
                <div className="h-10 bg-border/50 rounded-md w-32"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-24 bg-card border border-border rounded-xl"></div>
                <div className="h-24 bg-card border border-border rounded-xl"></div>
                <div className="h-24 bg-card border border-border rounded-xl"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 h-10 bg-card border border-border rounded-md"></div>
                <div className="w-full sm:w-40 h-10 bg-card border border-border rounded-md"></div>
            </div>

            <div className="h-[400px] bg-card border border-border rounded-xl mt-4"></div>
        </div>
    );
}
