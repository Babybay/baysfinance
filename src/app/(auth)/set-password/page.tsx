"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SetPasswordPage() {
    const [token, setToken] = useState("");
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        setToken(window.location.hash.slice(1));
        setReady(true);
    }, []);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (password !== confirmPassword) return setError("Password tidak sama. Ketik ulang dengan tepat.");
        setError("");
        setLoading(true);
        try {
            const response = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            if (!response.ok) throw new Error(await response.text());
            setComplete(true);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Tidak dapat menyimpan password.");
        } finally {
            setLoading(false);
        }
    }

    if (complete) return (
        <div className="w-full max-w-sm space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="font-serif text-3xl">Password sudah dibuat</h1>
            <p className="text-sm leading-6 text-muted-foreground">Akun portal klien siap digunakan.</p>
            <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-accent px-5 text-sm font-semibold text-accent-foreground">Masuk ke portal klien</Link>
        </div>
    );

    return (
        <div className="w-full max-w-sm space-y-6">
            <div>
                <p className="text-sm font-semibold text-accent">Aktivasi akun klien</p>
                <h1 className="mt-2 font-serif text-3xl">Buat password Anda</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan minimal 12 karakter. Jangan gunakan password yang sama dengan email atau mobile banking.</p>
            </div>
            {!ready ? <p className="text-sm text-muted-foreground">Memeriksa tautan…</p> : !token ? <p role="alert" className="rounded-[10px] bg-error-muted p-4 text-sm text-error">Tautan undangan tidak lengkap. Minta admin mengirim ulang.</p> : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p role="alert" className="rounded-[10px] bg-error-muted p-4 text-sm text-error">{error}</p>}
                    <Input label="Password baru" type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                    <Input label="Ketik ulang password" type="password" minLength={12} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                    <Button type="submit" variant="accent" className="min-h-12 w-full" disabled={loading} isLoading={loading}>Simpan password</Button>
                </form>
            )}
        </div>
    );
}
