"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerUser } from "@/app/actions/auth";
import Link from "next/link";

export default function SignUpPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Password tidak cocok.");
            return;
        }

        setLoading(true);

        const res = await registerUser({ email, password, name });

        if (!res.success) {
            setError(res.error || "Gagal mendaftar.");
            setLoading(false);
            return;
        }

        // Auto sign-in after registration
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            // Registration succeeded but auto-login failed — redirect to sign-in
            router.push("/sign-in");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
                <h1 className="font-serif text-3xl">Daftar</h1>
                <p className="text-sm text-muted-foreground">
                    Buat akun PajakConsult baru
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-lg bg-error-muted border border-error/30 text-error text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Nama Lengkap
                    </label>
                    <Input
                        type="text"
                        required
                        autoFocus
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Email
                    </label>
                    <Input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@perusahaan.com"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Password
                    </label>
                    <Input
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Konfirmasi Password
                    </label>
                    <Input
                        type="password"
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password"
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Memproses..." : "Daftar"}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/sign-in" className="text-accent hover:underline font-medium">
                    Masuk
                </Link>
            </p>
        </div>
    );
}
