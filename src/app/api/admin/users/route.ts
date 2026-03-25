import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

async function isCurrentUserAdmin(): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.role === "Admin" || user.role === "Staff";
}

export async function GET() {
    try {
        const adminOk = await isCurrentUserAdmin();
        if (!adminOk) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                clientId: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const mapped = users.map((u) => ({
            id: u.id,
            firstName: u.name.split(" ")[0] || u.name,
            lastName: u.name.split(" ").slice(1).join(" ") || "",
            email: u.email,
            role: u.role.toLowerCase(),
            clientId: u.clientId,
            isActive: u.isActive,
        }));

        return NextResponse.json(mapped);
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
        const { userId, role, clientId, name, email, password, isActive } = body;

        if (!userId) {
            return new NextResponse("Missing userId", { status: 400 });
        }

        const updateData: Record<string, unknown> = {};

        if (role) {
            const roleMap: Record<string, Role> = { admin: Role.Admin, staff: Role.Staff, client: Role.Client };
            updateData.role = roleMap[role.toLowerCase()] || Role.Client;
            updateData.clientId = role.toLowerCase() === "client" ? (clientId || null) : null;
        }

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[USERS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const adminOk = await isCurrentUserAdmin();
        if (!adminOk) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role, clientId } = body;

        if (!name || !email || !password) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const roleMap: Record<string, Role> = { admin: Role.Admin, staff: Role.Staff, client: Role.Client };
        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: roleMap[role?.toLowerCase()] || Role.Client,
                clientId: role?.toLowerCase() === "client" ? (clientId || null) : null,
            },
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error("[USERS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
