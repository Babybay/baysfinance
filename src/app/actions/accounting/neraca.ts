"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus, AccountType } from "@prisma/client";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import {
    codeToNumber,
    inRanges,
    type CodeRange,
} from "@/lib/accounting/account-ranges";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NeracaAccount {
    code: string;
    name: string;
    balance: number;
}

export interface NeracaGroup {
    label: string;
    accounts: NeracaAccount[];
    total: number;
}

export interface NeracaSide {
    groups: NeracaGroup[];
    total: number;
}

export interface NeracaData {
    clientId: string;
    clientName: string;
    endDate: string;
    asetLancar: NeracaGroup;
    asetTidakLancar: NeracaGroup;
    totalAset: number;
    kewajibanJangkaPendek: NeracaGroup;
    kewajibanJangkaPanjang: NeracaGroup;
    totalKewajiban: number;
    ekuitas: NeracaGroup;
    totalEkuitas: number;
    totalKewajibanDanEkuitas: number;
    isBalanced: boolean;
}

// ── Balance-sheet-specific account groupings ─────────────────────────────────
// These differ from the Neraca Lajur groupings: the balance sheet splits
// current / non-current, and moves Biaya Dibayar Dimuka (223) to current.

const BS_ASET_LANCAR: CodeRange[] = [
    [100, 101],   // Kas
    [110, 114],   // Bank
    [120, 122],   // Piutang
    [130, 140],   // Persediaan
    [223, 223],   // Biaya Dibayar Dimuka (current-asset prepaid)
];

const BS_ASET_TIDAK_LANCAR: CodeRange[] = [
    [210, 213],   // Aset Tetap + Akum. Penyusutan (net)
    [220, 222],   // Sewa, Amortisasi, Biaya Pra Operasi
];

const BS_KEWAJIBAN_PENDEK: CodeRange[] = [
    [300, 310],   // Utang Usaha
    [320, 321],   // Utang Pajak
];

const BS_KEWAJIBAN_PANJANG: CodeRange[] = [
    [400, 400],   // Utang Affiliasi / Owner
];

const BS_EKUITAS: CodeRange[] = [
    [410, 410],   // Cadangan
    [510, 514],   // Modal, Saldo Laba, Laba Tahun Berjalan
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function balanceDir(type: AccountType): 1 | -1 {
    return type === AccountType.Asset || type === AccountType.Expense ? 1 : -1;
}

function buildGroup(
    label: string,
    ranges: CodeRange[],
    balances: Map<string, { name: string; balance: number }>
): NeracaGroup {
    const accounts: NeracaAccount[] = [];
    for (const [code, { name, balance }] of balances) {
        if (inRanges(code, ranges)) {
            accounts.push({ code, name, balance });
        }
    }
    accounts.sort((a, b) => codeToNumber(a.code) - codeToNumber(b.code));
    const total = accounts.reduce((sum, a) => sum + a.balance, 0);
    return { label, accounts, total };
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function getNeraca(
    clientId: string,
    endDate: Date
): Promise<{ success: boolean; data?: NeracaData; error?: string }> {
    try {
        await assertCanAccessClient(clientId);

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, nama: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan." };

        const accounts = await prisma.account.findMany({
            where: {
                OR: [{ clientId: null }, { clientId }],
                isActive: true,
            },
            select: { id: true, code: true, name: true, type: true },
            orderBy: { code: "asc" },
        });

        if (accounts.length === 0) {
            return { success: true, data: emptyData(client.id, client.nama, endDate) };
        }

        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const accountIds = accounts.map((a) => a.id);

        // Cumulative balances up to endDate
        const items = await prisma.journalItem.findMany({
            where: {
                accountId: { in: accountIds },
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { lte: endDate },
                },
            },
            select: { accountId: true, debit: true, credit: true },
        });

        const rawBalances = new Map<string, number>();
        for (const item of items) {
            rawBalances.set(
                item.accountId,
                (rawBalances.get(item.accountId) || 0) + Number(item.debit) - Number(item.credit)
            );
        }

        // Convert to code-keyed signed balances
        const balances = new Map<string, { name: string; balance: number }>();
        for (const [accountId, net] of rawBalances) {
            const acct = accountById.get(accountId);
            if (!acct) continue;
            balances.set(acct.code, {
                name: acct.name,
                balance: net * balanceDir(acct.type),
            });
        }

        // ── ASET ─────────────────────────────────────────────────────────────
        const asetLancar = buildGroup("Aset Lancar", BS_ASET_LANCAR, balances);
        const asetTidakLancar = buildGroup("Aset Tidak Lancar", BS_ASET_TIDAK_LANCAR, balances);
        const totalAset = asetLancar.total + asetTidakLancar.total;

        // ── KEWAJIBAN ────────────────────────────────────────────────────────
        const kewajibanJangkaPendek = buildGroup("Kewajiban Jangka Pendek", BS_KEWAJIBAN_PENDEK, balances);
        const kewajibanJangkaPanjang = buildGroup("Kewajiban Jangka Panjang", BS_KEWAJIBAN_PANJANG, balances);
        const totalKewajiban = kewajibanJangkaPendek.total + kewajibanJangkaPanjang.total;

        // ── EKUITAS ──────────────────────────────────────────────────────────
        const ekuitas = buildGroup("Ekuitas", BS_EKUITAS, balances);
        const totalEkuitas = ekuitas.total;

        const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas;
        const isBalanced = Math.abs(totalAset - totalKewajibanDanEkuitas) < 1;

        return {
            success: true,
            data: {
                clientId: client.id,
                clientName: client.nama,
                endDate: endDate.toISOString(),
                asetLancar,
                asetTidakLancar,
                totalAset,
                kewajibanJangkaPendek,
                kewajibanJangkaPanjang,
                totalKewajiban,
                ekuitas,
                totalEkuitas,
                totalKewajibanDanEkuitas,
                isBalanced,
            },
        };
    } catch (error) {
        console.error("[getNeraca]", error);
        if (error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")) {
            return handleAuthError(error);
        }
        return { success: false, error: "Gagal memuat data neraca." };
    }
}

function emptyData(clientId: string, clientName: string, endDate: Date): NeracaData {
    const emptyGroup = (label: string): NeracaGroup => ({ label, accounts: [], total: 0 });
    return {
        clientId,
        clientName,
        endDate: endDate.toISOString(),
        asetLancar: emptyGroup("Aset Lancar"),
        asetTidakLancar: emptyGroup("Aset Tidak Lancar"),
        totalAset: 0,
        kewajibanJangkaPendek: emptyGroup("Kewajiban Jangka Pendek"),
        kewajibanJangkaPanjang: emptyGroup("Kewajiban Jangka Panjang"),
        totalKewajiban: 0,
        ekuitas: emptyGroup("Ekuitas"),
        totalEkuitas: 0,
        totalKewajibanDanEkuitas: 0,
        isBalanced: true,
    };
}
