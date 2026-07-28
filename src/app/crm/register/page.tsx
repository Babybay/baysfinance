import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CrmRegistrationForm } from "@/components/portal/CrmRegistrationForm";

export default function CrmRegistrationPage() {
    return (
        <main className="min-h-screen bg-surface px-4 py-10 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-xl">
                <Link href="/portal" className="mb-6 inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to portals
                </Link>
                <CrmRegistrationForm />
            </div>
        </main>
    );
}
