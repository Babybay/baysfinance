import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, JenisWP, ClientStatus } from "@prisma/client";

export async function POST(req: Request) {
    // L1: Always require and verify CLERK_WEBHOOK_SECRET — no dev bypass.
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
        console.error("[CLERK_WEBHOOK] CLERK_WEBHOOK_SECRET is not set.");
        return new NextResponse("Server misconfiguration", { status: 500 });
    }

    const svix_id = req.headers.get("svix-id");
    const svix_ts = req.headers.get("svix-timestamp");
    const svix_sig = req.headers.get("svix-signature");

    if (!svix_id || !svix_ts || !svix_sig) {
        return new NextResponse("Bad Request: missing svix headers", { status: 400 });
    }

    const body = await req.text();

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { Webhook } = await import("svix") as any;
        const wh = new Webhook(WEBHOOK_SECRET);
        const evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_ts,
            "svix-signature": svix_sig,
        }) as {
            type: string;
            data: {
                id: string;
                first_name?: string;
                last_name?: string;
                email_addresses?: { email_address: string }[];
            };
        };

        return await handleEvent(evt.type, evt.data);
    } catch (err) {
        // M7: do not leak internal details to the caller
        console.error("[CLERK_WEBHOOK] Signature verification failed:", err);
        return new NextResponse("Unauthorized: invalid signature", { status: 401 });
    }
}

interface ClerkUserData {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: { email_address: string }[];
}

async function handleEvent(eventType: string, userData: ClerkUserData) {
    if (
        (eventType === "user.created" || eventType === "user.updated") &&
        userData?.id
    ) {
        try {
            const client = await clerkClient();
            const user = await client.users.getUser(userData.id);

            const email = userData.email_addresses?.[0]?.email_address || "";
            const name =
                [userData.first_name, userData.last_name].filter(Boolean).join(" ") ||
                "User";
            const publicRole = user.publicMetadata?.role as string | undefined;

            // 1. Sync local User model for Staff/Admin
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
                    },
                });
                console.log(`[CLERK_WEBHOOK] Synced User ${userData.id} as ${publicRole}`);
            }

            // 2. C4: New users without a role get the "client" role.
            //    We also create a real Client DB row so assertCanAccessClient()
            //    can verify the clientId against the clients table.
            if (eventType === "user.created" && !publicRole) {
                // Deterministic ID — safe to retry without creating duplicates
                const clientId = `cl_${userData.id.replace("user_", "")}`;

                await prisma.client.upsert({
                    where: { id: clientId },
                    update: {}, // exists already — don't overwrite user-edited data
                    create: {
                        id: clientId,
                        nama: name,
                        npwp: "-",                       // placeholder; admin completes later
                        jenisWP: JenisWP.OrangPribadi,
                        email,
                        telepon: "-",
                        alamat: "-",
                        status: ClientStatus.Aktif,
                    },
                });

                await client.users.updateUserMetadata(userData.id, {
                    publicMetadata: { role: "client", clientId },
                });

                console.log(
                    `[CLERK_WEBHOOK] Created Client row and assigned role=client for user: ${userData.id}`
                );
            }

            return NextResponse.json({ message: "Sync complete", userId: userData.id });
        } catch (err) {
            // M7: log full error server-side, return generic message to caller
            console.error("[CLERK_WEBHOOK] handleEvent error:", err);
            return new NextResponse("Internal Error", { status: 500 });
        }
    }

    return NextResponse.json({ message: "Event ignored", type: eventType });
}
