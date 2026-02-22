import { clerkClient, auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

async function isCurrentUserAdmin(): Promise<boolean> {
    const { userId, sessionClaims } = await auth();
    if (!userId) return false;

    // Fast path: check session claims first
    const roleFromClaims = (sessionClaims as { metadata?: { role?: string } } | null)?.metadata?.role;
    if (roleFromClaims === "admin") return true;

    // Slow path: session may be stale, check Clerk user record directly
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const roleFromMetadata = (user.publicMetadata as { role?: string })?.role;
    return roleFromMetadata === "admin";
}

export async function GET() {
    try {
        const adminOk = await isCurrentUserAdmin();
        if (!adminOk) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const client = await clerkClient();
        const response = await client.users.getUserList({ limit: 100 });

        const users = response.data.map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.emailAddresses[0]?.emailAddress,
            role: (user.publicMetadata as { role?: string })?.role || "client",
            clientId: (user.publicMetadata as { clientId?: string })?.clientId || null,
        }));

        return NextResponse.json(users);
    } catch (error) {
        console.error("[USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const adminOk = await isCurrentUserAdmin();
        if (!adminOk) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const body = await req.json();
        const { userId, role, clientId } = body;

        if (!userId || !role) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                role,
                clientId: role === "client" ? (clientId || null) : null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[USERS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
