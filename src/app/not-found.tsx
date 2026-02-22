export const dynamic = "force-dynamic";

import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background flex-col gap-4">
            <h2 className="font-serif text-4xl text-foreground">404 — Not Found</h2>
            <p className="text-muted">The page you&apos;re looking for is not available</p>
            <Link href="/" className="text-accent hover:underline transition-colors">
                Back to Home
            </Link>
        </div>
    )
}
