import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    // ── Clients ──────────────────────────────────────────────────────────────
    const c1 = await prisma.client.upsert({
        where: { id: "c1" },
        update: {},
        create: {
            id: "c1",
            nama: "PT Maju Bersama",
            npwp: "01.234.567.8-901.000",
            jenisWP: "Badan",
            email: "finance@majubersama.co.id",
            telepon: "021-5551234",
            alamat: "Jl. Sudirman No. 45, Jakarta Selatan",
            status: "Aktif",
        },
    });

    const c2 = await prisma.client.upsert({
        where: { id: "c2" },
        update: {},
        create: {
            id: "c2",
            nama: "CV Sejahtera Abadi",
            npwp: "02.345.678.9-012.000",
            jenisWP: "Badan",
            email: "admin@sejahteraabadi.com",
            telepon: "021-5559876",
            alamat: "Jl. Gatot Subroto No. 12, Jakarta Pusat",
            status: "Aktif",
        },
    });

    const c3 = await prisma.client.upsert({
        where: { id: "c3" },
        update: {},
        create: {
            id: "c3",
            nama: "Budi Santoso",
            npwp: "03.456.789.0-123.000",
            jenisWP: "Orang Pribadi",
            email: "budi.santoso@gmail.com",
            telepon: "0812-3456-7890",
            alamat: "Jl. Kemang Raya No. 8, Jakarta Selatan",
            status: "Aktif",
        },
    });

    const c4 = await prisma.client.upsert({
        where: { id: "c4" },
        update: {},
        create: {
            id: "c4",
            nama: "PT Teknologi Nusantara",
            npwp: "04.567.890.1-234.000",
            jenisWP: "Badan",
            email: "tax@teknusa.co.id",
            telepon: "021-5553456",
            alamat: "Jl. TB Simatupang No. 99, Jakarta Timur",
            status: "Aktif",
        },
    });

    const c5 = await prisma.client.upsert({
        where: { id: "c5" },
        update: {},
        create: {
            id: "c5",
            nama: "Siti Rahayu",
            npwp: "05.678.901.2-345.000",
            jenisWP: "Orang Pribadi",
            email: "siti.rahayu@yahoo.com",
            telepon: "0813-9876-5432",
            alamat: "Jl. Panglima Polim No. 3, Jakarta Selatan",
            status: "Tidak Aktif",
        },
    });

    console.log("✅ Clients seeded");

    // ── Tax Deadlines ─────────────────────────────────────────────────────────
    const deadlines = [
        { id: "d1", jenisPajak: "PPh 21", deskripsi: "Setor PPh 21 Masa Januari 2026", tanggalBatas: new Date("2026-02-10"), masaPajak: "Januari 2026", status: "Sudah Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
        { id: "d2", jenisPajak: "PPh 21", deskripsi: "Lapor SPT Masa PPh 21 Januari 2026", tanggalBatas: new Date("2026-02-20"), masaPajak: "Januari 2026", status: "Sudah Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
        { id: "d3", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Januari 2026", tanggalBatas: new Date("2026-02-28"), masaPajak: "Januari 2026", status: "Belum Lapor", clientId: "c2", clientName: "CV Sejahtera Abadi" },
        { id: "d4", jenisPajak: "PPh 23", deskripsi: "Setor PPh 23 Masa Januari 2026", tanggalBatas: new Date("2026-02-10"), masaPajak: "Januari 2026", status: "Terlambat", clientId: "c4", clientName: "PT Teknologi Nusantara" },
        { id: "d5", jenisPajak: "PPh 25", deskripsi: "Setor PPh 25 Masa Februari 2026", tanggalBatas: new Date("2026-03-15"), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
        { id: "d6", jenisPajak: "SPT Tahunan OP", deskripsi: "Batas Lapor SPT Tahunan Orang Pribadi 2025", tanggalBatas: new Date("2026-03-31"), masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c3", clientName: "Budi Santoso" },
        { id: "d7", jenisPajak: "SPT Tahunan OP", deskripsi: "Batas Lapor SPT Tahunan Orang Pribadi 2025", tanggalBatas: new Date("2026-03-31"), masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c5", clientName: "Siti Rahayu" },
        { id: "d8", jenisPajak: "SPT Tahunan Badan", deskripsi: "Batas Lapor SPT Tahunan Badan 2025", tanggalBatas: new Date("2026-04-30"), masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
        { id: "d9", jenisPajak: "SPT Tahunan Badan", deskripsi: "Batas Lapor SPT Tahunan Badan 2025", tanggalBatas: new Date("2026-04-30"), masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c2", clientName: "CV Sejahtera Abadi" },
        { id: "d10", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Februari 2026", tanggalBatas: new Date("2026-03-31"), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c4", clientName: "PT Teknologi Nusantara" },
    ];

    for (const d of deadlines) {
        await prisma.taxDeadline.upsert({
            where: { id: d.id },
            update: {},
            create: d,
        });
    }

    console.log("✅ Tax Deadlines seeded");

    // ── Documents ─────────────────────────────────────────────────────────────
    const documents = [
        { id: "doc1", nama: "Faktur Pajak 010-23-00001234", kategori: "Faktur Pajak", clientId: "c1", clientName: "PT Maju Bersama", ukuran: "245 KB", tanggalUpload: new Date("2026-01-15"), catatan: "Faktur pajak keluaran Januari" },
        { id: "doc2", nama: "Bukti Potong PPh 23 - Jan 2026", kategori: "Bukti Potong", clientId: "c2", clientName: "CV Sejahtera Abadi", ukuran: "128 KB", tanggalUpload: new Date("2026-02-05"), catatan: "Bukti potong dari PT ABC" },
        { id: "doc3", nama: "SPT Tahunan 2024 - Budi Santoso", kategori: "SPT", clientId: "c3", clientName: "Budi Santoso", ukuran: "1.2 MB", tanggalUpload: new Date("2025-03-20"), catatan: "SPT 1770 tahun 2024" },
        { id: "doc4", nama: "Laporan Keuangan 2025 - PT Teknologi Nusantara", kategori: "Laporan Keuangan", clientId: "c4", clientName: "PT Teknologi Nusantara", ukuran: "3.4 MB", tanggalUpload: new Date("2026-02-10"), catatan: "Neraca & Laba Rugi" },
    ];

    for (const doc of documents) {
        await prisma.document.upsert({
            where: { id: doc.id },
            update: {},
            create: doc,
        });
    }

    console.log("✅ Documents seeded");

    // ── Invoices ──────────────────────────────────────────────────────────────
    const inv1 = await prisma.invoice.upsert({
        where: { id: "inv1" },
        update: {},
        create: {
            id: "inv1",
            nomorInvoice: "INV-2026-001",
            clientId: "c1",
            clientName: "PT Maju Bersama",
            tanggal: new Date("2026-01-15"),
            jatuhTempo: new Date("2026-02-15"),
            subtotal: 7500000,
            ppn: 825000,
            total: 8325000,
            status: "Lunas",
            catatan: "Pembayaran via transfer BCA",
            items: {
                create: [
                    { deskripsi: "Jasa Konsultasi Pajak - Januari 2026", qty: 1, harga: 5000000, jumlah: 5000000 },
                    { deskripsi: "Penyusunan SPT Masa PPN", qty: 1, harga: 2500000, jumlah: 2500000 },
                ],
            },
        },
    });

    const inv2 = await prisma.invoice.upsert({
        where: { id: "inv2" },
        update: {},
        create: {
            id: "inv2",
            nomorInvoice: "INV-2026-002",
            clientId: "c2",
            clientName: "CV Sejahtera Abadi",
            tanggal: new Date("2026-02-01"),
            jatuhTempo: new Date("2026-03-01"),
            subtotal: 5000000,
            ppn: 550000,
            total: 5550000,
            status: "Terkirim",
            catatan: "",
            items: {
                create: [
                    { deskripsi: "Jasa Konsultasi Pajak - Februari 2026", qty: 1, harga: 3500000, jumlah: 3500000 },
                    { deskripsi: "Review Faktur Pajak", qty: 1, harga: 1500000, jumlah: 1500000 },
                ],
            },
        },
    });

    const inv3 = await prisma.invoice.upsert({
        where: { id: "inv3" },
        update: {},
        create: {
            id: "inv3",
            nomorInvoice: "INV-2026-003",
            clientId: "c3",
            clientName: "Budi Santoso",
            tanggal: new Date("2026-02-10"),
            jatuhTempo: new Date("2026-03-10"),
            subtotal: 2000000,
            ppn: 220000,
            total: 2220000,
            status: "Draft",
            catatan: "Menunggu kelengkapan dokumen",
            items: {
                create: [
                    { deskripsi: "Penyusunan SPT Tahunan 1770", qty: 1, harga: 2000000, jumlah: 2000000 },
                ],
            },
        },
    });

    const inv4 = await prisma.invoice.upsert({
        where: { id: "inv4" },
        update: {},
        create: {
            id: "inv4",
            nomorInvoice: "INV-2026-004",
            clientId: "c4",
            clientName: "PT Teknologi Nusantara",
            tanggal: new Date("2026-01-20"),
            jatuhTempo: new Date("2026-02-20"),
            subtotal: 23000000,
            ppn: 2530000,
            total: 25530000,
            status: "Jatuh Tempo",
            catatan: "Sudah reminder 2x",
            items: {
                create: [
                    { deskripsi: "Jasa Konsultasi Pajak Bulanan", qty: 1, harga: 8000000, jumlah: 8000000 },
                    { deskripsi: "Penyusunan Laporan Keuangan", qty: 1, harga: 5000000, jumlah: 5000000 },
                    { deskripsi: "Tax Planning 2026", qty: 1, harga: 10000000, jumlah: 10000000 },
                ],
            },
        },
    });

    console.log("✅ Invoices seeded");

    // ── Business Permit Cases ─────────────────────────────────────────────────
    await prisma.businessPermitCase.upsert({
        where: { id: "bp1" },
        update: {},
        create: {
            id: "bp1",
            caseId: "BP-2026-001",
            clientId: "c1",
            clientName: "PT Maju Bersama",
            advisorId: "admin",
            serviceType: "PT",
            riskCategory: "Medium-Low",
            status: "Processing OSS",
            progress: 50,
            feeAmount: 15000000,
        },
    });

    await prisma.businessPermitCase.upsert({
        where: { id: "bp2" },
        update: {},
        create: {
            id: "bp2",
            caseId: "BP-2026-002",
            clientId: "c2",
            clientName: "CV Sejahtera Abadi",
            advisorId: "admin",
            serviceType: "NIB",
            riskCategory: "Low",
            status: "Issued",
            progress: 75,
            feeAmount: 5000000,
        },
    });

    await prisma.businessPermitCase.upsert({
        where: { id: "bp3" },
        update: {},
        create: {
            id: "bp3",
            caseId: "BP-2026-003",
            clientId: "c4",
            clientName: "PT Teknologi Nusantara",
            advisorId: "admin",
            serviceType: "Sertifikat Standar",
            riskCategory: "High",
            status: "Verification",
            progress: 25,
            feeAmount: 25000000,
        },
    });

    console.log("✅ Business Permit Cases seeded");
    console.log("🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });