import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authLimiter, apiLimiter } from "@/lib/rate-limit";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/api/auth", "/api/webhooks"];

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isCronPath(pathname: string): boolean {
    return pathname === "/api/cron" || pathname.startsWith("/api/cron/");
}

/** Security headers applied to every response */
function withSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload"
        );
    }
    return response;
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Cron endpoints: enforce CRON_SECRET at middleware level (defense-in-depth)
    if (isCronPath(pathname)) {
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("authorization");
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return withSecurityHeaders(new NextResponse("Unauthorized", { status: 401 }));
        }
        return withSecurityHeaders(NextResponse.next());
    }

    if (isPublic(pathname)) {
        // Rate limit only sign-in POST (not session checks which fire on every page load)
        if (pathname.startsWith("/api/auth/callback") && req.method === "POST") {
            const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
            const rateCheck = authLimiter.check(ip);
            if (!rateCheck.success) {
                return withSecurityHeaders(
                    NextResponse.json(
                        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
                        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
                    )
                );
            }
        }
        return withSecurityHeaders(NextResponse.next());
    }

    // General API rate limit: 100 requests per minute per IP
    if (pathname.startsWith("/api/")) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rateCheck = apiLimiter.check(ip);
        if (!rateCheck.success) {
            return withSecurityHeaders(
                NextResponse.json(
                    { error: "Rate limit exceeded. Please try again later." },
                    { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
                )
            );
        }
    }

    // Verify JWT without importing Prisma/bcrypt (Edge-compatible)
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return withSecurityHeaders(NextResponse.redirect(signInUrl));
    }

    return withSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};
