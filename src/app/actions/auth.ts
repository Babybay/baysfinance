"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, JenisWP, ClientStatus } from "@prisma/client";

export async function registerUser(data: {
    email: string;
    password: string;
    name: string;
}) {
    try {
        const { email, password, name } = data;

        if (!email || !password || !name) {
            return { success: false, error: "Semua field wajib diisi." };
        }

        if (password.length < 8) {
            return { success: false, error: "Password minimal 8 karakter." };
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: "Email sudah terdaftar." };
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Create client record for the new user
        const client = await prisma.client.create({
            data: {
                nama: name,
                npwp: "-",
                jenisWP: JenisWP.OrangPribadi,
                email,
                telepon: "-",
                alamat: "-",
                status: ClientStatus.Aktif,
            },
        });

        await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: Role.Client,
                clientId: client.id,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("[registerUser]", error);
        return { success: false, error: "Terjadi kesalahan saat mendaftar." };
    }
}
