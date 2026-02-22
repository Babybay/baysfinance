import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

        // --- Svix signature verification (production) ---
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
                    }) as { type: string; data: { id: string; first_name?: string; last_name?: string; email_addresses?: { email_address: string }[] } };

                    return await handleEvent(evt.type, evt.data);
                } catch {
                    return new NextResponse("Unauthorized: invalid signature", { status: 401 });
                }
            }
        }

        // Dev mode: parse body directly
        const payload = await req.json();
        return await handleEvent(payload.type, payload.data);

    } catch (error) {
        console.error("[CLERK_WEBHOOK]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

interface ClerkUserData {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: { email_address: string }[];
}

async function handleEvent(eventType: string, userData: ClerkUserData) {
    if (eventType === "user.created" && userData?.id) {
        const client = await clerkClient();

        // Generate a unique clientId based on the Clerk user ID
        // This creates a stable, unique ID like "cl_abc123xyz"
        const clientId = `cl_${userData.id.replace("user_", "")}`;

        // Auto-assign "client" role + unique clientId
        await client.users.updateUserMetadata(userData.id, {
            publicMetadata: {
                role: "client",
                clientId,
            },
        });

        console.log(`[CLERK_WEBHOOK] Assigned role=client, clientId=${clientId} to user: ${userData.id}`);
        return NextResponse.json({ message: "Role & clientId assigned", userId: userData.id, clientId });
    }

    return NextResponse.json({ message: "Event ignored", type: eventType });
}
