import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Simplified webhook handler — verifies the event and assigns the default role.
// In production you MUST verify the signature using Svix.
// Install: npm install svix
// Then uncomment the verification block below.

export async function POST(req: Request) {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

        // --- OPTIONAL: Svix signature verification (recommended for production) ---
        // If CLERK_WEBHOOK_SECRET is set, verify the webhook signature.
        if (WEBHOOK_SECRET) {
            const { Webhook } = await import("svix").catch(() => ({ Webhook: null }));
            if (Webhook) {
                const svix_id = req.headers.get("svix-id");
                const svix_ts = req.headers.get("svix-timestamp");
                const svix_sig = req.headers.get("svix-signature");

                if (!svix_id || !svix_ts || !svix_sig) {
                    return new NextResponse("Bad Request: missing svix headers", { status: 400 });
                }

                const body = await req.text();
                const wh = new Webhook(WEBHOOK_SECRET);
                try {
                    const evt = wh.verify(body, {
                        "svix-id": svix_id,
                        "svix-timestamp": svix_ts,
                        "svix-signature": svix_sig,
                    }) as { type: string; data: { id: string } };

                    return await handleEvent(evt.type, evt.data.id);
                } catch {
                    return new NextResponse("Unauthorized: invalid signature", { status: 401 });
                }
            }
        }
        // --- END: Svix signature verification  ---

        // If no CLERK_WEBHOOK_SECRET defined (dev mode), parse body directly.
        const payload = await req.json();
        return await handleEvent(payload.type, payload.data?.id);

    } catch (error) {
        console.error("[CLERK_WEBHOOK]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

async function handleEvent(eventType: string, userId: string) {
    // Only handle new user creation
    if (eventType === "user.created" && userId) {
        const client = await clerkClient();

        // Auto-assign "client" role to every new sign-up.
        // Admins should be manually promoted in the User Management page.
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: "client",
            },
        });

        console.log(`[CLERK_WEBHOOK] Auto-assigned 'client' role to new user: ${userId}`);
        return NextResponse.json({ message: "Role assigned", userId });
    }

    return NextResponse.json({ message: "Event ignored", type: eventType });
}
