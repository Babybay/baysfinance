"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { useI18n } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";

export default function SignInPage() {
    const { locale } = useI18n();
    const id = locale === "id";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(id ? "Email atau password salah." : "Incorrect email or password.");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError(id ? "Gagal masuk. Coba lagi sebentar." : "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm space-y-8">
            <div className="space-y-3">
                <Brand className="mb-5 text-accent lg:hidden" />
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">{id ? "Portal klien" : "Client portal"}</p>
                <h1 className="font-serif text-4xl">{id ? "Selamat datang kembali." : "Welcome back."}</h1>
                <p className="text-sm text-muted-foreground">
                    {id ? "Masuk ke akun CAL untuk melanjutkan." : "Sign in to your CAL account to continue."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div role="alert" className="p-3 rounded-lg bg-error-muted border border-error/30 text-error text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email
                    </label>
                    <Input
                        id="email"
                        className="h-12 rounded-xl"
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
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                    </label>
                    <Input
                        id="password"
                        className="h-12 rounded-xl"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={id ? "Masukkan password" : "Enter your password"}
                    />
                </div>

                <Button type="submit" variant="accent" disabled={loading} isLoading={loading} className="h-12 w-full gap-2">
                    {loading ? (id ? "Memproses..." : "Signing in...") : (id ? "Masuk" : "Sign in")} {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                {id ? "Belum menjadi klien?" : "New to CAL?"}{" "}
                <Link href="/crm/register" className="text-accent hover:underline font-medium">
                    {id ? "Mulai di sini" : "Get started"}
                </Link>
            </p>
        </div>
    );
}
