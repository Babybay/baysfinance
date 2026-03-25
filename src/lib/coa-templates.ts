import { AccountType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Chart of Accounts Templates
//
// Each template targets a specific Indonesian business type with accounts
// following SAK (Standar Akuntansi Keuangan) conventions.
//
// Code structure (consistent across all templates):
//   100-109  Kas                    300-310  Utang Usaha
//   110-119  Bank                   320-329  Utang Pajak
//   120-129  Piutang                400-409  Utang Jangka Panjang
//   130-149  Persediaan             410-419  Cadangan
//   210-219  Aset Tetap             510-514  Ekuitas
//   220-229  Aset Lain-Lain         600-609  Pendapatan Usaha
//                                   620-629  HPP / Beban Pokok
//                                   700-729  Beban Operasional
//                                   900-919  Pendapatan & Beban Non-Operasional
// ─────────────────────────────────────────────────────────────────────────────

export interface CoaAccount {
    code: string;
    name: string;
    type: AccountType;
}

export interface CoaTemplate {
    id: string;
    name: string;
    description: string;
    icon: string; // lucide icon name
    accounts: CoaAccount[];
    contraAssetCodes: string[];
}

// ── Shared equity accounts (all templates) ──────────────────────────────────

const EQUITY_ACCOUNTS: CoaAccount[] = [
    { code: "510", name: "Modal Disetor", type: AccountType.Equity },
    { code: "511", name: "Cadangan", type: AccountType.Equity },
    { code: "512", name: "Prive", type: AccountType.Equity },
    { code: "513", name: "Saldo Laba", type: AccountType.Equity },
    { code: "514", name: "Laba Rugi Tahun Berjalan", type: AccountType.Equity },
];

// ═════════════════════════════════════════════════════════════════════════════
// 1. JASA KONSULTAN / PROFESSIONAL SERVICES
// ═════════════════════════════════════════════════════════════════════════════

const jasaKonsultan: CoaTemplate = {
    id: "jasa-konsultan",
    name: "Jasa Konsultan",
    description: "Kantor konsultan, akuntan, hukum, dan jasa profesional lainnya",
    icon: "Briefcase",
    contraAssetCodes: ["212", "213"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Kas Kecil", type: AccountType.Asset },
        { code: "101", name: "Kas Umum", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank Operasional", type: AccountType.Asset },
        { code: "120", name: "Piutang Usaha", type: AccountType.Asset },
        { code: "121", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "210", name: "Peralatan Kantor", type: AccountType.Asset },
        { code: "211", name: "Kendaraan", type: AccountType.Asset },
        { code: "212", name: "Akumulasi Penyusutan Peralatan", type: AccountType.Asset },
        { code: "213", name: "Akumulasi Penyusutan Kendaraan", type: AccountType.Asset },
        { code: "220", name: "Sewa Dibayar Dimuka", type: AccountType.Asset },
        { code: "221", name: "Asuransi Dibayar Dimuka", type: AccountType.Asset },
        { code: "222", name: "Biaya Dibayar Dimuka Lainnya", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Usaha", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PPN", type: AccountType.Liability },
        { code: "321", name: "Utang PPh 21", type: AccountType.Liability },
        { code: "322", name: "Utang PPh 23", type: AccountType.Liability },
        { code: "323", name: "Utang PPh Badan", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Pendapatan Jasa Konsultasi", type: AccountType.Revenue },
        { code: "601", name: "Pendapatan Jasa Pelatihan", type: AccountType.Revenue },
        { code: "602", name: "Pendapatan Jasa Lainnya", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Lainnya", type: AccountType.Revenue },

        // ── BEBAN OPERASIONAL ──
        { code: "700", name: "Gaji dan Tunjangan", type: AccountType.Expense },
        { code: "701", name: "BPJS Kesehatan & Ketenagakerjaan", type: AccountType.Expense },
        { code: "702", name: "Sewa Kantor", type: AccountType.Expense },
        { code: "703", name: "Listrik & Air", type: AccountType.Expense },
        { code: "704", name: "Telepon & Internet", type: AccountType.Expense },
        { code: "705", name: "Transportasi & Perjalanan Dinas", type: AccountType.Expense },
        { code: "706", name: "Perlengkapan Kantor", type: AccountType.Expense },
        { code: "707", name: "Percetakan & Fotocopy", type: AccountType.Expense },
        { code: "708", name: "Penyusutan Aset Tetap", type: AccountType.Expense },
        { code: "709", name: "Asuransi", type: AccountType.Expense },
        { code: "710", name: "Pelatihan & Pengembangan SDM", type: AccountType.Expense },
        { code: "711", name: "Jasa Profesional (Hukum, Audit)", type: AccountType.Expense },
        { code: "712", name: "Iklan & Promosi", type: AccountType.Expense },
        { code: "713", name: "Jamuan & Representasi", type: AccountType.Expense },
        { code: "714", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Beban Bunga", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. HOTEL & RESTORAN
// ═════════════════════════════════════════════════════════════════════════════

const hotelRestoran: CoaTemplate = {
    id: "hotel-restoran",
    name: "Hotel & Restoran",
    description: "Hotel, restoran, kafe, katering, dan usaha F&B lainnya",
    icon: "UtensilsCrossed",
    contraAssetCodes: ["212", "213", "221"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Petty Cash", type: AccountType.Asset },
        { code: "101", name: "General Cashier", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank BNI Giro", type: AccountType.Asset },
        { code: "112", name: "Bank BNI Taplus", type: AccountType.Asset },
        { code: "113", name: "Bank BCA", type: AccountType.Asset },
        { code: "114", name: "Bank BPR Lestari", type: AccountType.Asset },
        { code: "120", name: "Piutang Usaha", type: AccountType.Asset },
        { code: "121", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "122", name: "Piutang Affiliasi/Owner", type: AccountType.Asset },
        { code: "130", name: "Persediaan Makanan", type: AccountType.Asset },
        { code: "131", name: "Persediaan Minuman", type: AccountType.Asset },
        { code: "132", name: "Persediaan Guest Supplies", type: AccountType.Asset },
        { code: "133", name: "Persediaan Paper Supplies", type: AccountType.Asset },
        { code: "134", name: "Persediaan Cleaning Supplies", type: AccountType.Asset },
        { code: "135", name: "Persediaan Chemical", type: AccountType.Asset },
        { code: "136", name: "Persediaan Kitchen Supplies", type: AccountType.Asset },
        { code: "137", name: "Persediaan Minibar", type: AccountType.Asset },
        { code: "138", name: "Persediaan BBM & Gas", type: AccountType.Asset },
        { code: "139", name: "Persediaan Botol & Kontainer", type: AccountType.Asset },
        { code: "140", name: "Persediaan Lainnya", type: AccountType.Asset },
        { code: "210", name: "Gedung", type: AccountType.Asset },
        { code: "211", name: "Inventaris", type: AccountType.Asset },
        { code: "212", name: "Akumulasi Penyusutan Gedung", type: AccountType.Asset },
        { code: "213", name: "Akumulasi Penyusutan Inventaris", type: AccountType.Asset },
        { code: "220", name: "Sewa Tanah dan Bangunan", type: AccountType.Asset },
        { code: "221", name: "Akumulasi Amortisasi Sewa", type: AccountType.Asset },
        { code: "222", name: "Biaya Pra Operasi", type: AccountType.Asset },
        { code: "223", name: "Biaya Dibayar Dimuka", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Usaha", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PB 1/PHR", type: AccountType.Liability },
        { code: "321", name: "Utang Pajak Badan", type: AccountType.Liability },
        { code: "400", name: "Utang Affiliasi/Pemilik", type: AccountType.Liability },
        { code: "410", name: "Cadangan Lost & Breakage", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Pendapatan Food Restaurant", type: AccountType.Revenue },
        { code: "601", name: "Pendapatan Beverage Restaurant", type: AccountType.Revenue },
        { code: "602", name: "Pendapatan Food Banquet", type: AccountType.Revenue },
        { code: "603", name: "Pendapatan Beverage Banquet", type: AccountType.Revenue },
        { code: "604", name: "Pendapatan Lainnya", type: AccountType.Revenue },
        { code: "605", name: "Diskon & Allowance", type: AccountType.Revenue },
        { code: "606", name: "Pajak PB 1", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga Bank", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Tip Box", type: AccountType.Revenue },
        { code: "902", name: "Pendapatan Non-Operasional Lainnya", type: AccountType.Revenue },

        // ── HPP ──
        { code: "620", name: "HPP - Makanan", type: AccountType.Expense },
        { code: "621", name: "HPP - Minuman", type: AccountType.Expense },
        { code: "622", name: "HPP - Beverage for Food", type: AccountType.Expense },
        { code: "623", name: "HPP - Food to Beverage", type: AccountType.Expense },
        { code: "624", name: "HPP - Lainnya", type: AccountType.Expense },

        // ── BEBAN OPERASIONAL ──
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
        { code: "714", name: "Iklan & Promosi", type: AccountType.Expense },
        { code: "715", name: "Percetakan & Alat Tulis", type: AccountType.Expense },
        { code: "716", name: "Menu & Beverage List", type: AccountType.Expense },
        { code: "717", name: "Ekspedisi dan Materai", type: AccountType.Expense },
        { code: "718", name: "Promosi", type: AccountType.Expense },
        { code: "719", name: "Entertainment/Complimentary", type: AccountType.Expense },
        { code: "720", name: "Welcome Drink/Snack", type: AccountType.Expense },
        { code: "721", name: "Komisi Kartu Kredit", type: AccountType.Expense },
        { code: "722", name: "Banten/Upacara", type: AccountType.Expense },
        { code: "723", name: "Sewa Tanah dan Bangunan", type: AccountType.Expense },
        { code: "724", name: "Penyusutan Aset Tetap", type: AccountType.Expense },
        { code: "725", name: "Amortisasi Biaya Pra Operasi", type: AccountType.Expense },
        { code: "726", name: "Beban Lost & Breakage", type: AccountType.Expense },
        { code: "727", name: "Management Fee", type: AccountType.Expense },
        { code: "728", name: "Consultant Fee", type: AccountType.Expense },
        { code: "729", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Selisih Kas", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
        { code: "913", name: "CS Event", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. PERDAGANGAN UMUM (GENERAL TRADING)
// ═════════════════════════════════════════════════════════════════════════════

const perdagangan: CoaTemplate = {
    id: "perdagangan",
    name: "Perdagangan Umum",
    description: "Toko retail, distributor, grosir, dan usaha jual-beli barang",
    icon: "ShoppingCart",
    contraAssetCodes: ["212", "213"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Kas Kecil", type: AccountType.Asset },
        { code: "101", name: "Kas Umum", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank Operasional", type: AccountType.Asset },
        { code: "120", name: "Piutang Dagang", type: AccountType.Asset },
        { code: "121", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "122", name: "Piutang Karyawan", type: AccountType.Asset },
        { code: "130", name: "Persediaan Barang Dagangan", type: AccountType.Asset },
        { code: "131", name: "Persediaan Dalam Perjalanan", type: AccountType.Asset },
        { code: "210", name: "Peralatan Toko", type: AccountType.Asset },
        { code: "211", name: "Kendaraan", type: AccountType.Asset },
        { code: "212", name: "Akumulasi Penyusutan Peralatan", type: AccountType.Asset },
        { code: "213", name: "Akumulasi Penyusutan Kendaraan", type: AccountType.Asset },
        { code: "220", name: "Sewa Dibayar Dimuka", type: AccountType.Asset },
        { code: "221", name: "Uang Muka Pembelian", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Dagang", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PPN", type: AccountType.Liability },
        { code: "321", name: "Utang PPh 21", type: AccountType.Liability },
        { code: "322", name: "Utang PPh 23", type: AccountType.Liability },
        { code: "323", name: "Utang PPh Badan", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Penjualan Barang Dagangan", type: AccountType.Revenue },
        { code: "601", name: "Diskon Penjualan", type: AccountType.Revenue },
        { code: "602", name: "Retur Penjualan", type: AccountType.Revenue },
        { code: "603", name: "Pendapatan Jasa Pengiriman", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Lainnya", type: AccountType.Revenue },

        // ── HPP ──
        { code: "620", name: "Harga Pokok Penjualan", type: AccountType.Expense },
        { code: "621", name: "Diskon Pembelian", type: AccountType.Expense },
        { code: "622", name: "Retur Pembelian", type: AccountType.Expense },
        { code: "623", name: "Ongkos Kirim Pembelian", type: AccountType.Expense },

        // ── BEBAN OPERASIONAL ──
        { code: "700", name: "Gaji dan Tunjangan", type: AccountType.Expense },
        { code: "701", name: "BPJS Kesehatan & Ketenagakerjaan", type: AccountType.Expense },
        { code: "702", name: "Sewa Toko / Gudang", type: AccountType.Expense },
        { code: "703", name: "Listrik & Air", type: AccountType.Expense },
        { code: "704", name: "Telepon & Internet", type: AccountType.Expense },
        { code: "705", name: "Transportasi & Pengiriman", type: AccountType.Expense },
        { code: "706", name: "Perlengkapan Toko", type: AccountType.Expense },
        { code: "707", name: "Packaging & Supplies", type: AccountType.Expense },
        { code: "708", name: "Penyusutan Aset Tetap", type: AccountType.Expense },
        { code: "709", name: "Asuransi", type: AccountType.Expense },
        { code: "710", name: "Iklan & Promosi", type: AccountType.Expense },
        { code: "711", name: "Pemeliharaan Toko", type: AccountType.Expense },
        { code: "712", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Selisih Kas", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. MANUFAKTUR (MANUFACTURING)
// ═════════════════════════════════════════════════════════════════════════════

const manufaktur: CoaTemplate = {
    id: "manufaktur",
    name: "Manufaktur",
    description: "Pabrik, pengolahan, dan usaha produksi barang",
    icon: "Factory",
    contraAssetCodes: ["214", "215", "216"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Kas Kecil", type: AccountType.Asset },
        { code: "101", name: "Kas Umum", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank Operasional", type: AccountType.Asset },
        { code: "120", name: "Piutang Dagang", type: AccountType.Asset },
        { code: "121", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "130", name: "Persediaan Bahan Baku", type: AccountType.Asset },
        { code: "131", name: "Persediaan Barang Dalam Proses (WIP)", type: AccountType.Asset },
        { code: "132", name: "Persediaan Barang Jadi", type: AccountType.Asset },
        { code: "133", name: "Persediaan Bahan Penolong", type: AccountType.Asset },
        { code: "134", name: "Persediaan Suku Cadang", type: AccountType.Asset },
        { code: "210", name: "Tanah", type: AccountType.Asset },
        { code: "211", name: "Gedung Pabrik", type: AccountType.Asset },
        { code: "212", name: "Mesin & Peralatan Pabrik", type: AccountType.Asset },
        { code: "213", name: "Kendaraan", type: AccountType.Asset },
        { code: "214", name: "Akumulasi Penyusutan Gedung", type: AccountType.Asset },
        { code: "215", name: "Akumulasi Penyusutan Mesin", type: AccountType.Asset },
        { code: "216", name: "Akumulasi Penyusutan Kendaraan", type: AccountType.Asset },
        { code: "220", name: "Sewa Dibayar Dimuka", type: AccountType.Asset },
        { code: "221", name: "Asuransi Dibayar Dimuka", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Dagang", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PPN", type: AccountType.Liability },
        { code: "321", name: "Utang PPh 21", type: AccountType.Liability },
        { code: "322", name: "Utang PPh 23", type: AccountType.Liability },
        { code: "323", name: "Utang PPh Badan", type: AccountType.Liability },
        { code: "400", name: "Utang Bank Jangka Panjang", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Penjualan Barang Jadi", type: AccountType.Revenue },
        { code: "601", name: "Penjualan Sisa Bahan / Scrap", type: AccountType.Revenue },
        { code: "602", name: "Diskon Penjualan", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Lainnya", type: AccountType.Revenue },

        // ── HPP / BIAYA PRODUKSI ──
        { code: "620", name: "Biaya Bahan Baku", type: AccountType.Expense },
        { code: "621", name: "Biaya Tenaga Kerja Langsung", type: AccountType.Expense },
        { code: "622", name: "Biaya Overhead Pabrik", type: AccountType.Expense },
        { code: "623", name: "Biaya Listrik Pabrik", type: AccountType.Expense },
        { code: "624", name: "Biaya Pemeliharaan Mesin", type: AccountType.Expense },
        { code: "625", name: "Biaya Bahan Penolong", type: AccountType.Expense },
        { code: "626", name: "Biaya Penyusutan Mesin Pabrik", type: AccountType.Expense },

        // ── BEBAN OPERASIONAL ──
        { code: "700", name: "Gaji Administrasi & Umum", type: AccountType.Expense },
        { code: "701", name: "BPJS Kesehatan & Ketenagakerjaan", type: AccountType.Expense },
        { code: "702", name: "Sewa Kantor", type: AccountType.Expense },
        { code: "703", name: "Listrik & Air Kantor", type: AccountType.Expense },
        { code: "704", name: "Telepon & Internet", type: AccountType.Expense },
        { code: "705", name: "Transportasi & Pengiriman", type: AccountType.Expense },
        { code: "706", name: "Perlengkapan Kantor", type: AccountType.Expense },
        { code: "707", name: "Penyusutan Aset Tetap Non-Pabrik", type: AccountType.Expense },
        { code: "708", name: "Asuransi", type: AccountType.Expense },
        { code: "709", name: "Iklan & Promosi", type: AccountType.Expense },
        { code: "710", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Beban Bunga Pinjaman", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. KONSTRUKSI (CONSTRUCTION)
// ═════════════════════════════════════════════════════════════════════════════

const konstruksi: CoaTemplate = {
    id: "konstruksi",
    name: "Konstruksi",
    description: "Kontraktor, pengembang properti, dan jasa konstruksi",
    icon: "HardHat",
    contraAssetCodes: ["214", "215", "216"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Kas Kecil", type: AccountType.Asset },
        { code: "101", name: "Kas Proyek", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank Operasional", type: AccountType.Asset },
        { code: "120", name: "Piutang Usaha", type: AccountType.Asset },
        { code: "121", name: "Retensi Piutang", type: AccountType.Asset },
        { code: "122", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "130", name: "Persediaan Material", type: AccountType.Asset },
        { code: "131", name: "Pekerjaan Dalam Pelaksanaan (WIP)", type: AccountType.Asset },
        { code: "210", name: "Tanah", type: AccountType.Asset },
        { code: "211", name: "Alat Berat", type: AccountType.Asset },
        { code: "212", name: "Kendaraan", type: AccountType.Asset },
        { code: "213", name: "Peralatan Kantor", type: AccountType.Asset },
        { code: "214", name: "Akumulasi Penyusutan Alat Berat", type: AccountType.Asset },
        { code: "215", name: "Akumulasi Penyusutan Kendaraan", type: AccountType.Asset },
        { code: "216", name: "Akumulasi Penyusutan Peralatan", type: AccountType.Asset },
        { code: "220", name: "Uang Muka Proyek", type: AccountType.Asset },
        { code: "221", name: "Jaminan Pelaksanaan", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Usaha / Subkontraktor", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PPN", type: AccountType.Liability },
        { code: "321", name: "Utang PPh Final Jasa Konstruksi", type: AccountType.Liability },
        { code: "322", name: "Utang PPh 21", type: AccountType.Liability },
        { code: "323", name: "Utang PPh Badan", type: AccountType.Liability },
        { code: "400", name: "Utang Bank", type: AccountType.Liability },
        { code: "410", name: "Uang Muka Pelanggan", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Pendapatan Kontrak", type: AccountType.Revenue },
        { code: "601", name: "Pendapatan Tambahan (Change Order)", type: AccountType.Revenue },
        { code: "602", name: "Pendapatan Klaim", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Lainnya", type: AccountType.Revenue },

        // ── BIAYA PROYEK (HPP) ──
        { code: "620", name: "Biaya Material Proyek", type: AccountType.Expense },
        { code: "621", name: "Biaya Tenaga Kerja Proyek", type: AccountType.Expense },
        { code: "622", name: "Biaya Subkontraktor", type: AccountType.Expense },
        { code: "623", name: "Biaya Sewa Alat", type: AccountType.Expense },
        { code: "624", name: "Biaya Mobilisasi & Demobilisasi", type: AccountType.Expense },
        { code: "625", name: "Biaya Proyek Lainnya", type: AccountType.Expense },

        // ── BEBAN OPERASIONAL ──
        { code: "700", name: "Gaji & Tunjangan Kantor", type: AccountType.Expense },
        { code: "701", name: "BPJS Kesehatan & Ketenagakerjaan", type: AccountType.Expense },
        { code: "702", name: "Sewa Kantor", type: AccountType.Expense },
        { code: "703", name: "Listrik & Air", type: AccountType.Expense },
        { code: "704", name: "Telepon & Internet", type: AccountType.Expense },
        { code: "705", name: "Transportasi", type: AccountType.Expense },
        { code: "706", name: "Perlengkapan Kantor", type: AccountType.Expense },
        { code: "707", name: "Penyusutan Aset Tetap", type: AccountType.Expense },
        { code: "708", name: "Asuransi", type: AccountType.Expense },
        { code: "709", name: "Jaminan & Garansi Proyek", type: AccountType.Expense },
        { code: "710", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Beban Bunga Pinjaman", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. STARTUP / PERUSAHAAN TEKNOLOGI
// ═════════════════════════════════════════════════════════════════════════════

const startupTech: CoaTemplate = {
    id: "startup-tech",
    name: "Startup & Teknologi",
    description: "Perusahaan SaaS, startup digital, IT services, dan e-commerce",
    icon: "Monitor",
    contraAssetCodes: ["212", "213"],
    accounts: [
        // ── ASET ──
        { code: "100", name: "Kas Kecil", type: AccountType.Asset },
        { code: "101", name: "Kas Umum", type: AccountType.Asset },
        { code: "110", name: "Bank Utama", type: AccountType.Asset },
        { code: "111", name: "Bank Operasional", type: AccountType.Asset },
        { code: "120", name: "Piutang Usaha", type: AccountType.Asset },
        { code: "121", name: "Piutang Lain-Lain", type: AccountType.Asset },
        { code: "210", name: "Peralatan IT (Hardware)", type: AccountType.Asset },
        { code: "211", name: "Peralatan Kantor", type: AccountType.Asset },
        { code: "212", name: "Akumulasi Penyusutan Peralatan IT", type: AccountType.Asset },
        { code: "213", name: "Akumulasi Penyusutan Peralatan Kantor", type: AccountType.Asset },
        { code: "220", name: "Software & Lisensi", type: AccountType.Asset },
        { code: "221", name: "Sewa Dibayar Dimuka", type: AccountType.Asset },
        { code: "222", name: "Domain & Sertifikat", type: AccountType.Asset },

        // ── KEWAJIBAN ──
        { code: "300", name: "Utang Usaha", type: AccountType.Liability },
        { code: "310", name: "Utang Lain-Lain", type: AccountType.Liability },
        { code: "320", name: "Utang PPN", type: AccountType.Liability },
        { code: "321", name: "Utang PPh 21", type: AccountType.Liability },
        { code: "322", name: "Utang PPh 23", type: AccountType.Liability },
        { code: "323", name: "Utang PPh Badan", type: AccountType.Liability },
        { code: "324", name: "Pendapatan Diterima Dimuka", type: AccountType.Liability },

        // ── EKUITAS ──
        ...EQUITY_ACCOUNTS,

        // ── PENDAPATAN ──
        { code: "600", name: "Pendapatan SaaS / Langganan", type: AccountType.Revenue },
        { code: "601", name: "Pendapatan Jasa Pengembangan", type: AccountType.Revenue },
        { code: "602", name: "Pendapatan Jasa Konsultasi IT", type: AccountType.Revenue },
        { code: "603", name: "Pendapatan Lisensi Software", type: AccountType.Revenue },
        { code: "604", name: "Pendapatan Lainnya", type: AccountType.Revenue },
        { code: "900", name: "Pendapatan Bunga", type: AccountType.Revenue },
        { code: "901", name: "Pendapatan Non-Operasional Lainnya", type: AccountType.Revenue },

        // ── BEBAN OPERASIONAL ──
        { code: "700", name: "Gaji & Tunjangan", type: AccountType.Expense },
        { code: "701", name: "BPJS Kesehatan & Ketenagakerjaan", type: AccountType.Expense },
        { code: "702", name: "Server & Cloud Hosting", type: AccountType.Expense },
        { code: "703", name: "Software & Tools Berlangganan", type: AccountType.Expense },
        { code: "704", name: "Sewa Kantor / Co-working", type: AccountType.Expense },
        { code: "705", name: "Listrik & Internet", type: AccountType.Expense },
        { code: "706", name: "Perlengkapan Kantor", type: AccountType.Expense },
        { code: "707", name: "Penyusutan Aset Tetap", type: AccountType.Expense },
        { code: "708", name: "Marketing & Akuisisi Pelanggan", type: AccountType.Expense },
        { code: "709", name: "Pelatihan & Konferensi", type: AccountType.Expense },
        { code: "710", name: "Jasa Profesional (Legal, Audit)", type: AccountType.Expense },
        { code: "711", name: "Domain & Sertifikat SSL", type: AccountType.Expense },
        { code: "712", name: "Payment Gateway Fee", type: AccountType.Expense },
        { code: "713", name: "Beban Operasional Lainnya", type: AccountType.Expense },

        // ── BEBAN NON-OPERASIONAL ──
        { code: "910", name: "Administrasi Bank", type: AccountType.Expense },
        { code: "911", name: "Beban Bunga", type: AccountType.Expense },
        { code: "912", name: "Beban Non-Operasional Lainnya", type: AccountType.Expense },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═════════════════════════════════════════════════════════════════════════════

export const COA_TEMPLATES: CoaTemplate[] = [
    jasaKonsultan,
    hotelRestoran,
    perdagangan,
    manufaktur,
    konstruksi,
    startupTech,
];

export function getTemplate(id: string): CoaTemplate | undefined {
    return COA_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateIds(): string[] {
    return COA_TEMPLATES.map((t) => t.id);
}
