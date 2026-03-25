"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError("Email atau password salah.");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
                <h1 className="font-serif text-3xl">Masuk</h1>
                <p className="text-sm text-muted-foreground">
                    Masuk ke akun PajakConsult Anda
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
                        Email
                    </label>
                    <Input
                        type="email"
                        required
                        autoFocus
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
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password"
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Memproses..." : "Masuk"}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link href="/sign-up" className="text-accent hover:underline font-medium">
                    Daftar
                </Link>
            </p>
        </div>
    );
}
