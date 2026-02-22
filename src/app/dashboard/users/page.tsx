"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/lib/hooks/useRoles";
import { sampleClients } from "@/lib/data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Shield, User, Edit2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ManagedUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: "admin" | "client";
    clientId: string | null;
}

export default function UserManagementPage() {
    const { t } = useI18n();
    const { isAdmin, isLoaded: roleLoaded } = useRoles();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<ManagedUser | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roleLoaded && isAdmin) {
            fetchUsers();
        }
    }, [roleLoaded, isAdmin]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;

        try {
            setUpdating(editUser.id);
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: editUser.id,
                    role: editUser.role,
                    clientId: editUser.clientId,
                }),
            });

            if (res.ok) {
                setMessage({ type: "success", text: t.userManagement.updateSuccess });
                await fetchUsers();
                setEditUser(null);
            } else {
                setMessage({ type: "error", text: t.userManagement.updateError });
            }
        } catch (error) {
            setMessage({ type: "error", text: t.userManagement.updateError });
        } finally {
            setUpdating(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (!roleLoaded || (loading && users.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-accent animate-spin mb-4" />
                <p className="text-muted animate-pulse">Memuat data user...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <Shield className="h-12 w-12 text-error mb-4" />
                <h2 className="font-serif text-xl text-foreground">Akses Dibatasi</h2>
                <p className="text-muted-foreground mt-2 text-center max-w-md">Halaman ini hanya dapat diakses oleh Admin (Advisor).</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-foreground font-serif">{t.userManagement.title}</h1>
                <p className="text-muted-foreground">{t.userManagement.subtitle}</p>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-4 rounded-[12px] flex items-center gap-3 border ${message.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                : "bg-error-muted border-error/20 text-error"
                            }`}
                    >
                        {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <p className="text-sm font-medium">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-6 py-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{t.userManagement.table.name}</th>
                                <th className="text-left px-6 py-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{t.userManagement.table.role}</th>
                                <th className="text-left px-6 py-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{t.userManagement.table.client}</th>
                                <th className="text-right px-6 py-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{t.userManagement.table.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-accent-muted flex items-center justify-center text-accent">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={user.role === "admin" ? "accent" : "secondary"}>
                                            {user.role === "admin" ? t.userManagement.roles.admin : t.userManagement.roles.client}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === "client" ? (
                                            <div className="text-sm text-foreground">
                                                {sampleClients.find(c => c.id === user.clientId)?.nama || "—"}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground italic">Advisor Access</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="soft"
                                            size="sm"
                                            onClick={() => setEditUser(user)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={!!editUser}
                onClose={() => setEditUser(null)}
                title={t.userManagement.title}
            >
                {editUser && (
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-surface rounded-[12px] border border-border">
                                <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center text-accent">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="font-medium text-foreground truncate">{editUser.firstName} {editUser.lastName}</div>
                                    <div className="text-xs text-muted-foreground truncate">{editUser.email}</div>
                                </div>
                            </div>

                            <Select
                                label={t.userManagement.table.role}
                                value={editUser.role}
                                onChange={(e) => setEditUser({
                                    ...editUser,
                                    role: e.target.value as "admin" | "client",
                                    clientId: e.target.value === "admin" ? null : editUser.clientId
                                })}
                                options={[
                                    { value: "admin", label: t.userManagement.roles.admin },
                                    { value: "client", label: t.userManagement.roles.client },
                                ]}
                            />

                            {editUser.role === "client" && (
                                <Select
                                    label={t.userManagement.assignClient.label}
                                    value={editUser.clientId || ""}
                                    onChange={(e) => setEditUser({ ...editUser, clientId: e.target.value })}
                                    options={[
                                        { value: "", label: t.userManagement.assignClient.none },
                                        ...sampleClients.map(c => ({ value: c.id, label: c.nama }))
                                    ]}
                                    placeholder={t.userManagement.assignClient.placeholder}
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="soft"
                                onClick={() => setEditUser(null)}
                                disabled={!!updating}
                            >
                                {t.userManagement.cancel}
                            </Button>
                            <Button
                                type="submit"
                                variant="accent"
                                disabled={!!updating}
                            >
                                {updating === editUser.id ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t.userManagement.saveChanges}...
                                    </>
                                ) : (
                                    t.userManagement.saveChanges
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
