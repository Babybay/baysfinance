"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus, AccountType } from "@prisma/client";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import {
    ACCOUNT_RANGES,
    codeToNumber,
    inRanges,
    type CodeRange,
} from "@/lib/accounting/account-ranges";

/** Maximum allowed date range for report queries. */
const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

// ── Types ────────────────────────────────────────────────────────────────────

export interface NLAccount {
    code: string;
    name: string;
    balance: number; // signed balance (negative = parentheses)
}

export interface NLSubsection {
    label: string;
    accounts: NLAccount[];
    total: number;
}

export interface NLSection {
    label: string;
    subsections: NLSubsection[];
    total: number;
}

export interface NeracaLajurData {
    clientId: string;
    clientName: string;
    startDate: string;
    endDate: string;
    aset: NLSection;
    kewajiban: NLSection;
    labaRugi: NLSection;
    totalAset: number;
    totalKewajibanDanModal: number;
    isBalanced: boolean;
    totalPendapatan: number;
    totalBeban: number;
    labaRugiSebelumPajak: number;
    labaRugiSetelahPajak: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function balanceDir(type: AccountType): 1 | -1 {
    return type === AccountType.Asset || type === AccountType.Expense ? 1 : -1;
}

function buildSubsection(
    label: string,
    ranges: CodeRange[],
    balances: Map<string, { name: string; balance: number }>
): NLSubsection {
    const accounts: NLAccount[] = [];
    for (const [code, { name, balance }] of balances) {
        if (inRanges(code, ranges) && balance !== 0) {
            accounts.push({ code, name, balance });
        }
    }
    accounts.sort((a, b) => codeToNumber(a.code) - codeToNumber(b.code));
    const total = accounts.reduce((sum, a) => sum + a.balance, 0);
    return { label, accounts, total };
}

// ── Server Action ─────────────────────────────────────────────────────────────

export async function getNeracaLajur(
    clientId: string,
    startDate: Date,
    endDate: Date
): Promise<{ success: boolean; data?: NeracaLajurData; error?: string }> {
    try {
        // C1: authorise
        await assertCanAccessClient(clientId);

        if (endDate < startDate) {
            return { success: false, error: "Tanggal akhir harus setelah tanggal awal" };
        }

        // L3: cap maximum range
        if (endDate.getTime() - startDate.getTime() > MAX_RANGE_MS) {
            return { success: false, error: "Rentang tanggal maksimal 1 tahun." };
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, nama: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        // Fetch all active accounts for this client
        const accounts = await prisma.account.findMany({
            where: {
                OR: [{ clientId: null }, { clientId }],
                isActive: true,
            },
            select: { id: true, code: true, name: true, type: true },
            orderBy: { code: "asc" },
        });

        if (accounts.length === 0) {
            return {
                success: true,
                data: emptyData(client.id, client.nama, startDate, endDate),
            };
        }

        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const accountIds = accounts.map((a) => a.id);

        // Closing balance = all posted items up to endDate (cumulative)
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

        // Aggregate by account — M6: convert Decimal → number for arithmetic
        const rawBalances = new Map<string, number>(); // accountId → net debit-credit
        for (const item of items) {
            rawBalances.set(
                item.accountId,
                (rawBalances.get(item.accountId) || 0) + Number(item.debit) - Number(item.credit)
            );
        }

        // Convert to code-keyed map with signed balance
        const balances = new Map<string, { name: string; balance: number }>();
        for (const [accountId, net] of rawBalances) {
            const acct = accountById.get(accountId);
            if (!acct) continue;
            const balance = net * balanceDir(acct.type);
            balances.set(acct.code, { name: acct.name, balance });
        }

        // ASET section
        const kasSection = buildSubsection("KAS", ACCOUNT_RANGES.kas, balances);
        const bankSection = buildSubsection("BANK", ACCOUNT_RANGES.bank, balances);
        const piutangSection = buildSubsection("PIUTANG", ACCOUNT_RANGES.piutang, balances);
        const persediaanSection = buildSubsection("PERSEDIAAN", ACCOUNT_RANGES.persediaan, balances);
        const asetTetapSection = buildSubsection("ASET TETAP", ACCOUNT_RANGES.asetTetap, balances);
        const asetLainSection = buildSubsection("ASET LAIN-LAIN", ACCOUNT_RANGES.asetLainLain, balances);

        const aset: NLSection = {
            label: "ASET",
            subsections: [kasSection, bankSection, piutangSection, persediaanSection, asetTetapSection, asetLainSection],
            total:
                kasSection.total +
                bankSection.total +
                piutangSection.total +
                persediaanSection.total +
                asetTetapSection.total +
                asetLainSection.total,
        };

        // KEWAJIBAN section
        const utangSection = buildSubsection("UTANG", ACCOUNT_RANGES.utang, balances);
        const utangPajakSection = buildSubsection("UTANG PAJAK", ACCOUNT_RANGES.utangPajak, balances);
        const utangAfiliasi = buildSubsection("UTANG AFFILIASI", ACCOUNT_RANGES.utangAfiliasi, balances);
        const cadanganSection = buildSubsection("CADANGAN", ACCOUNT_RANGES.cadangan, balances);
        const ekuitasSection = buildSubsection("EKUITAS", ACCOUNT_RANGES.ekuitas, balances);

        const kewajiban: NLSection = {
            label: "KEWAJIBAN DAN MODAL",
            subsections: [utangSection, utangPajakSection, utangAfiliasi, cadanganSection, ekuitasSection],
            total:
                utangSection.total +
                utangPajakSection.total +
                utangAfiliasi.total +
                cadanganSection.total +
                ekuitasSection.total,
        };

        // LABA RUGI section
        const pendapatanSection = buildSubsection("PENDAPATAN", ACCOUNT_RANGES.pendapatan, balances);
        const bebanSection = buildSubsection("BEBAN", ACCOUNT_RANGES.beban, balances);

        const totalPendapatan = pendapatanSection.total;
        const totalBeban = bebanSection.total;
        const labaRugiSebelumPajak = totalPendapatan - totalBeban;

        // Pajak = balance of account 321
        const pajak321 = balances.get("321")?.balance || 0;
        const labaRugiSetelahPajak = labaRugiSebelumPajak - Math.abs(pajak321);

        const labaRugi: NLSection = {
            label: "LABA RUGI",
            subsections: [pendapatanSection, bebanSection],
            total: labaRugiSebelumPajak,
        };

        const totalAset = aset.total;
        const totalKewajibanDanModal = kewajiban.total;
        const diff = Math.abs(totalAset - totalKewajibanDanModal);
        const isBalanced = diff < 1; // allow rounding tolerance of Rp 1

        return {
            success: true,
            data: {
                clientId: client.id,
                clientName: client.nama,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                aset,
                kewajiban,
                labaRugi,
                totalAset,
                totalKewajibanDanModal,
                isBalanced,
                totalPendapatan,
                totalBeban,
                labaRugiSebelumPajak,
                labaRugiSetelahPajak,
            },
        };
    } catch (error) {
        console.error("[getNeracaLajur]", error);
        if (error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")) {
            return handleAuthError(error);
        }
        return { success: false, error: "Gagal memuat data neraca lajur." };
    }
}

function emptyData(
    clientId: string,
    clientName: string,
    startDate: Date,
    endDate: Date
): NeracaLajurData {
    const emptySection = (label: string): NLSection => ({
        label,
        subsections: [],
        total: 0,
    });
    return {
        clientId,
        clientName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        aset: emptySection("ASET"),
        kewajiban: emptySection("KEWAJIBAN DAN MODAL"),
        labaRugi: emptySection("LABA RUGI"),
        totalAset: 0,
        totalKewajibanDanModal: 0,
        isBalanced: true,
        totalPendapatan: 0,
        totalBeban: 0,
        labaRugiSebelumPajak: 0,
        labaRugiSetelahPajak: 0,
    };
}
