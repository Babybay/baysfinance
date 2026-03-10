"use server";

import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

const defaultAccounts: { code: string; name: string; type: AccountType }[] = [
    // ─── ASET ────────────────────────────────────────────────────────────────

    // Kas
    { code: "100", name: "Petty Cash", type: AccountType.Asset },
    { code: "101", name: "General Cashier", type: AccountType.Asset },

    // Bank
    { code: "110", name: "PT Bank for Cashier", type: AccountType.Asset },
    { code: "111", name: "Bank BNI Giro", type: AccountType.Asset },
    { code: "112", name: "Bank BNI Taplus", type: AccountType.Asset },
    { code: "113", name: "Bank BCA", type: AccountType.Asset },
    { code: "114", name: "Bank BPR Lestari", type: AccountType.Asset },

    // Piutang
    { code: "120", name: "Piutang Usaha", type: AccountType.Asset },
    { code: "121", name: "Piutang Lain Lain", type: AccountType.Asset },
    { code: "122", name: "Piutang Affiliasi/Owner", type: AccountType.Asset },

    // Persediaan
    { code: "130", name: "Inv - Food Inventory", type: AccountType.Asset },
    { code: "131", name: "Inv - Beverages Inventory", type: AccountType.Asset },
    { code: "132", name: "Inv - Supplies Guest", type: AccountType.Asset },
    { code: "133", name: "Inv - Supplies Paper", type: AccountType.Asset },
    { code: "134", name: "Inv - Supplies Cleaning", type: AccountType.Asset },
    { code: "135", name: "Inv - Supplies Chemical", type: AccountType.Asset },
    { code: "136", name: "Inv - Supplies Kitchen", type: AccountType.Asset },
    { code: "137", name: "Inv - Supplies Minibar", type: AccountType.Asset },
    { code: "138", name: "Inv - Fuel, Gas, Lubricants", type: AccountType.Asset },
    { code: "139", name: "Inv - Bottles & Container", type: AccountType.Asset },
    { code: "140", name: "Inv - Others", type: AccountType.Asset },

    // Aset Tetap
    { code: "210", name: "Gedung", type: AccountType.Asset },
    { code: "211", name: "Inventaris", type: AccountType.Asset },
    { code: "212", name: "Akumulasi Penyusutan Gedung", type: AccountType.Asset },
    { code: "213", name: "Akumulasi Penyusutan Inventaris", type: AccountType.Asset },

    // Aset Lain-lain
    { code: "220", name: "Sewa Tanah dan Bangunan", type: AccountType.Asset },
    { code: "221", name: "Akumulasi Amortisasi Sewa Tanah dan Bangunan", type: AccountType.Asset },
    { code: "222", name: "Biaya Pra Operasi", type: AccountType.Asset },
    { code: "223", name: "Biaya Dibayar Dimuka", type: AccountType.Asset },

    // ─── KEWAJIBAN ───────────────────────────────────────────────────────────

    // Utang
    { code: "300", name: "Utang Usaha", type: AccountType.Liability },
    { code: "310", name: "Utang Lain Lain", type: AccountType.Liability },

    // Utang Pajak
    { code: "320", name: "PB 1/PHR", type: AccountType.Liability },
    { code: "321", name: "Pajak Badan", type: AccountType.Liability },

    // Utang Affiliasi
    { code: "400", name: "Utang Affiliasi/Pemilik", type: AccountType.Liability },

    // Cadangan
    { code: "410", name: "Cadangan Lost & Breakage", type: AccountType.Liability },

    // ─── EKUITAS ─────────────────────────────────────────────────────────────

    { code: "510", name: "Modal Disetor", type: AccountType.Equity },
    { code: "511", name: "Cadangan", type: AccountType.Equity },
    { code: "512", name: "Prive", type: AccountType.Equity },
    { code: "513", name: "Saldo Laba", type: AccountType.Equity },
    { code: "514", name: "Laba Rugi Tahun Berjalan", type: AccountType.Equity },

    // ─── PENDAPATAN ──────────────────────────────────────────────────────────

    // Pendapatan Usaha
    { code: "600", name: "Food Restaurant", type: AccountType.Revenue },
    { code: "601", name: "Beverage Restaurant", type: AccountType.Revenue },
    { code: "602", name: "Food Banquet", type: AccountType.Revenue },
    { code: "603", name: "Beverage Banquet", type: AccountType.Revenue },
    { code: "604", name: "Others Revenue", type: AccountType.Revenue },
    { code: "605", name: "Discount & Allowance", type: AccountType.Revenue },
    { code: "606", name: "Pajak PB 1", type: AccountType.Revenue },

    // Pendapatan Non Operasional
    { code: "900", name: "Bunga Bank", type: AccountType.Revenue },
    { code: "901", name: "Tip Box", type: AccountType.Revenue },
    { code: "902", name: "Pendapatan Lainnya", type: AccountType.Revenue },

    // ─── BEBAN ───────────────────────────────────────────────────────────────

    // Beban Pokok Penjualan
    { code: "620", name: "Cost of Sales - Food", type: AccountType.Expense },
    { code: "621", name: "Cost of Sales - Beverage", type: AccountType.Expense },
    { code: "622", name: "Cost of Sales - Beverage for Food", type: AccountType.Expense },
    { code: "623", name: "Cost of Sales - Food to Beverage", type: AccountType.Expense },
    { code: "624", name: "Cost of Sales - Other", type: AccountType.Expense },

    // Beban Operasional
    { code: "700", name: "Gaji dan Upah", type: AccountType.Expense },
    { code: "701", name: "Tunjangan Hari Raya", type: AccountType.Expense },
    { code: "702", name: "Tunjangan Kesehatan", type: AccountType.Expense },
    { code: "703", name: "Tunjangan Seragam", type: AccountType.Expense },
    { code: "704", name: "Listrik/PLN", type: AccountType.Expense },
    { code: "705", name: "Telepon", type: AccountType.Expense },
    { code: "706", name: "Air/PAM", type: AccountType.Expense },
    { code: "707", name: "Internet", type: AccountType.Expense },
    { code: "708", name: "BBM/Transportasi", type: AccountType.Expense },
    { code: "709", name: "Cleaning Supplies", type: AccountType.Expense },
    { code: "710", name: "Rumah Tangga", type: AccountType.Expense },
    { code: "711", name: "Pemeliharaan Inventaris", type: AccountType.Expense },
    { code: "712", name: "Pest Control", type: AccountType.Expense },
    { code: "713", name: "Food & Beverage Testing", type: AccountType.Expense },
    { code: "714", name: "Advertising", type: AccountType.Expense },
    { code: "715", name: "Printing & Stationery", type: AccountType.Expense },
    { code: "716", name: "Menu & Beverage List", type: AccountType.Expense },
    { code: "717", name: "Ekspedisi dan Materai", type: AccountType.Expense },
    { code: "718", name: "Promosi", type: AccountType.Expense },
    { code: "719", name: "Entertainment/Complimentary", type: AccountType.Expense },
    { code: "720", name: "Welcome Drink/Snack", type: AccountType.Expense },
    { code: "721", name: "Credit Card Commission", type: AccountType.Expense },
    { code: "722", name: "Banten", type: AccountType.Expense },
    { code: "723", name: "Sewa Tanah dan Bangunan", type: AccountType.Expense },
    { code: "724", name: "Penyusutan Aset Tetap dan Inventaris", type: AccountType.Expense },
    { code: "725", name: "Amortisasi Biaya Pra Operasi", type: AccountType.Expense },
    { code: "726", name: "Beban Provision for Lost & Breakage", type: AccountType.Expense },
    { code: "727", name: "Management Fee", type: AccountType.Expense },
    { code: "728", name: "Consultant Fee", type: AccountType.Expense },
    { code: "729", name: "Lainnya/Others", type: AccountType.Expense },

    // Beban Non Operasional
    { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
    { code: "911", name: "Selisih Kas", type: AccountType.Expense },
    { code: "912", name: "Beban Lainnya/Others", type: AccountType.Expense },
    { code: "913", name: "CS Event", type: AccountType.Expense },
];

export async function seedAccounts(clientId?: string, force: boolean = false) {
    try {
        const resolvedClientId = clientId || null;

        const existing = await prisma.account.count({
            where: { clientId: resolvedClientId },
        });

        if (existing > 0 && !force) {
            return { success: true, message: "Accounts already exist" };
        }

        if (force) {
            await prisma.account.deleteMany({
                where: { clientId: resolvedClientId }
            });
        }

        await prisma.$transaction(
            defaultAccounts.map((acc) =>
                prisma.account.create({
                    data: {
                        code: acc.code,
                        name: acc.name,
                        type: acc.type,
                        isActive: true,
                        clientId: resolvedClientId,
                    },
                })
            )
        );

        return {
            success: true,
            message: `${defaultAccounts.length} akun berhasil dibuat`,
        };
    } catch (error: any) {
        console.error("seedAccounts error:", error);
        console.error("Error meta:", error.meta);
        return { success: false, error: `DB Error: ${error.code} | Meta: ${JSON.stringify(error.meta)}` };
    }
}