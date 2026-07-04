import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, CheckCircle2, CircleDollarSign, FileCheck, Plus, Receipt, ShieldAlert, Users } from "lucide-react";
import { getAgencyOverview } from "@/app/actions/agency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatIDR } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AgencyPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/sign-in");
    }

    if (user.role !== "Admin" && user.role !== "Staff") {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <ShieldAlert className="h-12 w-12 text-error mb-4" />
                <h2 className="font-serif text-xl text-foreground">Akses Dibatasi</h2>
                <p className="text-muted-foreground mt-2 text-center max-w-md">
                    Agency command center hanya tersedia untuk owner dan staff agency.
                </p>
            </div>
        );
    }

    const response = await getAgencyOverview();

    if (!response.success || !response.data) {
        return (
            <div className="rounded-[16px] border border-border bg-card p-8">
                <h1 className="font-serif text-2xl text-foreground">Agency</h1>
                <p className="mt-2 text-sm text-muted-foreground">{response.error || "Gagal memuat agency."}</p>
            </div>
        );
    }

    const data = response.data;
    const utilization = data.totalSubAccounts > 0
        ? Math.round((data.activeSubAccounts / data.totalSubAccounts) * 100)
        : 0;

    const metrics = [
        {
            label: "Sub-accounts aktif",
            value: `${data.activeSubAccounts}/${data.totalSubAccounts}`,
            hint: `${utilization}% portfolio aktif`,
            icon: Building2,
        },
        {
            label: "Agency users",
            value: data.agencyUsers,
            hint: `${data.clientPortalUsers} portal client users`,
            icon: Users,
        },
        {
            label: "Open deadlines",
            value: data.openDeadlines,
            hint: "Butuh follow-up compliance",
            icon: CalendarDays,
        },
        {
            label: "Active permits",
            value: data.activePermits,
            hint: "Cases belum selesai",
            icon: FileCheck,
        },
        {
            label: "Revenue bulan ini",
            value: formatIDR(data.monthlyRevenue),
            hint: "Invoice paid bulan berjalan",
            icon: CircleDollarSign,
        },
        {
            label: "Outstanding",
            value: formatIDR(data.outstanding),
            hint: "Terkirim + jatuh tempo",
            icon: Receipt,
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        Agency Workspace
                    </div>
                    <h1 className="mt-3 font-serif text-3xl text-foreground">{data.agencyName}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Manage the agency, team, and client sub-accounts from one operator view. Every sub-account keeps its own tax, invoice, document, permit, and accounting workspace.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/clients">
                        <Button variant="soft" className="gap-2">
                            <Plus className="h-4 w-4" />
                            New sub-account
                        </Button>
                    </Link>
                    <Link href="/dashboard/users">
                        <Button variant="accent" className="gap-2">
                            <Users className="h-4 w-4" />
                            Manage access
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[16px] border border-border bg-card p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-surface text-foreground">
                                <metric.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <div className="rounded-[16px] border border-border bg-card">
                    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-serif text-xl text-foreground">Sub-accounts</h2>
                            <p className="text-sm text-muted-foreground">GHL-style client workspaces under your agency.</p>
                        </div>
                        <Badge variant="neutral">{data.totalSubAccounts} total</Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface">
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Account</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Users</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Workload</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Money</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Open</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.subAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            No sub-accounts yet. Create the first one to start operating like an agency.
                                        </td>
                                    </tr>
                                ) : (
                                    data.subAccounts.map((account) => (
                                        <tr key={account.id} className="hover:bg-surface/60">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <Link href={`/dashboard/clients/${account.id}`} className="font-medium text-foreground hover:text-accent">
                                                        {account.name}
                                                    </Link>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-xs text-muted-foreground">{account.npwp}</span>
                                                        <Badge variant={account.status === "Aktif" ? "success" : "default"}>{account.status}</Badge>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">{account.users}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <span>{account.invoices} invoices</span>
                                                    <span>{account.documents} docs</span>
                                                    <span>{account.permits} permits</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="font-medium text-foreground">{formatIDR(account.revenue)}</p>
                                                <p className="text-xs text-muted-foreground">{formatIDR(account.outstanding)} outstanding</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {account.openDeadlines === 0 ? (
                                                    <span className="inline-flex items-center justify-end gap-1 text-xs font-medium text-success">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Clear
                                                    </span>
                                                ) : (
                                                    <Badge variant="warning">{account.openDeadlines} deadlines</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[16px] border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground">Operating model</h2>
                        <div className="mt-5 space-y-4">
                            <div className="rounded-[12px] border border-border bg-surface p-4">
                                <p className="text-sm font-medium text-foreground">Agency</p>
                                <p className="mt-1 text-xs text-muted-foreground">Owns billing, staff, reporting, and all sub-account access.</p>
                            </div>
                            <div className="rounded-[12px] border border-border bg-surface p-4">
                                <p className="text-sm font-medium text-foreground">Sub-account</p>
                                <p className="mt-1 text-xs text-muted-foreground">A client workspace with isolated tax, accounting, document, permit, and invoice data.</p>
                            </div>
                            <div className="rounded-[12px] border border-border bg-surface p-4">
                                <p className="text-sm font-medium text-foreground">Portal user</p>
                                <p className="mt-1 text-xs text-muted-foreground">Client-side login scoped to one sub-account only.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground">Next commercial layer</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            The next upgrade should add package tiers per sub-account, internal assignment, white-label branding, and per-sub-account automations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
