"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Plus, Search, Edit2, Trash2, Users, ShieldAlert } from "lucide-react";
import { Client, sampleClients, generateId } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";

const emptyClient: Omit<Client, "id" | "createdAt"> = {
    nama: "",
    npwp: "",
    jenisWP: "Orang Pribadi",
    email: "",
    telepon: "",
    alamat: "",
    status: "Aktif",
};

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [filterJenis, setFilterJenis] = useState("Semua");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState(emptyClient);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const { isAdmin, isLoaded: roleLoaded } = useRoles();

    useEffect(() => {
        const stored = localStorage.getItem("pajak_clients");
        if (stored) {
            setClients(JSON.parse(stored));
        } else {
            setClients(sampleClients);
            localStorage.setItem("pajak_clients", JSON.stringify(sampleClients));
        }
    }, []);

    const saveClients = (updated: Client[]) => {
        setClients(updated);
        localStorage.setItem("pajak_clients", JSON.stringify(updated));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient) {
            const updated = clients.map((c) =>
                c.id === editingClient.id ? { ...editingClient, ...form } : c
            );
            saveClients(updated);
        } else {
            const newClient: Client = {
                ...form,
                id: generateId(),
                createdAt: new Date().toISOString().split("T")[0],
            };
            saveClients([newClient, ...clients]);
        }
        closeModal();
    };

    const handleDelete = (id: string) => {
        saveClients(clients.filter((c) => c.id !== id));
        setDeleteConfirm(null);
    };

    const openEdit = (client: Client) => {
        setEditingClient(client);
        setForm({
            nama: client.nama,
            npwp: client.npwp,
            jenisWP: client.jenisWP,
            email: client.email,
            telepon: client.telepon,
            alamat: client.alamat,
            status: client.status,
        });
        setModalOpen(true);
    };

    const openAdd = () => {
        setEditingClient(null);
        setForm(emptyClient);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingClient(null);
        setForm(emptyClient);
    };

    const filtered = clients.filter((c) => {
        const matchSearch =
            c.nama.toLowerCase().includes(search.toLowerCase()) ||
            c.npwp.includes(search) ||
            c.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filterJenis === "Semua" || c.jenisWP === filterJenis;
        return matchSearch && matchFilter;
    });

    if (!roleLoaded) {
        return <div className="flex items-center justify-center py-20 animate-pulse text-muted-foreground">Memuat...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <ShieldAlert className="h-12 w-12 text-error mb-4" />
                <h2 className="font-serif text-xl text-foreground">Akses Dibatasi</h2>
                <p className="text-muted-foreground mt-2 text-center max-w-md">Halaman ini hanya dapat diakses oleh Admin (Advisor).</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manajemen Klien</h1>
                    <p className="text-sm text-muted-foreground mt-1">{clients.length} klien terdaftar</p>
                </div>
                <button onClick={openAdd} className="flex items-center justify-center h-10 px-4 rounded-[8px] bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Klien
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari nama, NPWP, atau email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-[8px] border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                </div>
                <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="h-10 px-3 rounded-[8px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-card text-foreground"
                >
                    <option value="Semua">Semua Jenis WP</option>
                    <option value="Orang Pribadi">Orang Pribadi</option>
                    <option value="Badan">Badan</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-card rounded-[12px] border border-border shadow-[var(--shadow-color)_0px_2px_8px_0px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Nama</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">NPWP</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Jenis WP</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">Email</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">Telepon</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>Tidak ada klien ditemukan</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((client) => (
                                    <tr key={client.id} className="hover:bg-surface/60 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{client.nama}</td>
                                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{client.npwp}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <Badge variant={client.jenisWP === "Badan" ? "info" : "default"}>
                                                {client.jenisWP}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.email}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.telepon}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={client.status === "Aktif" ? "success" : "default"}>
                                                {client.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(client)}
                                                    className="p-2 rounded-[8px] hover:bg-accent-muted text-muted-foreground hover:text-accent transition-colors"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(client.id)}
                                                    className="p-2 rounded-[8px] hover:bg-error-muted text-muted-foreground hover:text-error transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={closeModal} title={editingClient ? "Edit Klien" : "Tambah Klien Baru"} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nama Lengkap / Badan Usaha" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required placeholder="PT Contoh Indonesia" />
                        <Input label="NPWP" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} required placeholder="XX.XXX.XXX.X-XXX.XXX" />
                        <Select label="Jenis Wajib Pajak" value={form.jenisWP} onChange={(e) => setForm({ ...form, jenisWP: e.target.value as Client["jenisWP"] })} options={[{ value: "Orang Pribadi", label: "Orang Pribadi" }, { value: "Badan", label: "Badan" }]} />
                        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client["status"] })} options={[{ value: "Aktif", label: "Aktif" }, { value: "Tidak Aktif", label: "Tidak Aktif" }]} />
                        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" />
                        <Input label="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="021-XXXXXXX" />
                    </div>
                    <Input label="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Jl. Contoh No. 1, Jakarta" />
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="soft" onClick={closeModal}>Batal</Button>
                        <Button type="submit" variant="accent">{editingClient ? "Simpan Perubahan" : "Tambah Klien"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus Klien" size="sm">
                <p className="text-sm text-muted-foreground mb-6">
                    Apakah Anda yakin ingin menghapus klien ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="soft" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                    <Button variant="accent" className="bg-error hover:bg-error/90" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
                </div>
            </Modal>
        </div>
    );
}
