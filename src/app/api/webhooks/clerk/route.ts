import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

        // --- Svix signature verification (production) ---
        if (WEBHOOK_SECRET) {
            // @ts-ignore
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

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

async function handleEvent(eventType: string, userData: ClerkUserData) {
    if ((eventType === "user.created" || eventType === "user.updated") && userData?.id) {
        const client = await clerkClient();
        const user = await client.users.getUser(userData.id);

        const email = userData.email_addresses?.[0]?.email_address || "";
        const name = [userData.first_name, userData.last_name].filter(Boolean).join(" ") || "User";

        // 1. Sync local User model for Staff/Admin
        const publicRole = user.publicMetadata.role as string;
        if (publicRole === "admin" || publicRole === "staff") {
            await prisma.user.upsert({
                where: { clerkId: userData.id },
                update: {
                    name,
                    email,
                    role: publicRole === "admin" ? Role.Admin : Role.Staff,
                },
                create: {
                    clerkId: userData.id,
                    name,
                    email,
                    role: publicRole === "admin" ? Role.Admin : Role.Staff,
                }
            });
            console.log(`[CLERK_WEBHOOK] Synced local User: ${userData.id} as ${publicRole}`);
        }

        // 2. Handle specific user.created logic (e.g. auto-assigning client role if needed)
        if (eventType === "user.created" && !publicRole) {
            const clientId = `cl_${userData.id.replace("user_", "")}`;
            await client.users.updateUserMetadata(userData.id, {
                publicMetadata: {
                    role: "client",
                    clientId,
                },
            });
            console.log(`[CLERK_WEBHOOK] Auto-assigned role=client to user: ${userData.id}`);
        }

        return NextResponse.json({ message: "Sync complete", userId: userData.id });
    }

    return NextResponse.json({ message: "Event ignored", type: eventType });
}
