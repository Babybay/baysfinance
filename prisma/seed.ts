import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database with realistic data...");

    // ── Clients ──────────────────────────────────────────────────────────────
    const clientsData = [
        { id: "c1", nama: "PT Nusantara Teknologi Sukses", npwp: "01.234.567.8-011.000", jenisWP: "Badan", email: "finance@nusatek.co.id", telepon: "021-5551234", alamat: "Gedung Cyber Lt. 5, Jl. Kuningan Barat, Jakarta Selatan", status: "Aktif" },
        { id: "c2", nama: "CV Kopi Kenangan Senja", npwp: "02.345.678.9-022.000", jenisWP: "Badan", email: "tax@kopisenja.com", telepon: "021-5559876", alamat: "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan", status: "Aktif" },
        { id: "c3", nama: "Dr. Andi Setiawan, Sp.JP", npwp: "85.456.789.0-033.000", jenisWP: "Orang Pribadi", email: "andi.kardiolog@gmail.com", telepon: "0812-3456-7890", alamat: "Jl. R.S. Fatmawati No. 12, Cilandak, Jakarta Selatan", status: "Aktif" },
        { id: "c4", nama: "PT Konstruksi Baja Unggul", npwp: "04.567.890.1-044.000", jenisWP: "Badan", email: "accounting@bajauunggul.co.id", telepon: "021-5553456", alamat: "Kawasan Industri Pulogadung Blok F, Jakarta Timur", status: "Aktif" },
        { id: "c5", nama: "Siti Rahayu, S.E.", npwp: "75.678.901.2-055.000", jenisWP: "Orang Pribadi", email: "siti.rahayu.freelance@yahoo.com", telepon: "0813-9876-5432", alamat: "Apartemen Kalibata City Tower C, Jakarta Selatan", status: "Tidak Aktif" },
        { id: "c6", nama: "PT Logistik Samudra Mas", npwp: "01.111.222.3-066.000", jenisWP: "Badan", email: "pajak@samudramas.com", telepon: "021-4445556", alamat: "Pelabuhan Tanjung Priok, Jakarta Utara", status: "Aktif" },
        { id: "c7", nama: "Klinik Estetika Pesona", npwp: "02.222.333.4-077.000", jenisWP: "Badan", email: "finance@klinikpesona.co.id", telepon: "021-3334445", alamat: "Jl. Kemang Raya No. 15, Jakarta Selatan", status: "Aktif" },
        { id: "c8", nama: "Ir. Budi Gunawan, M.T.", npwp: "89.333.444.5-088.000", jenisWP: "Orang Pribadi", email: "budi.arsitek@gmail.com", telepon: "0811-2223-333", alamat: "Perumahan Pondok Indah, Jakarta Selatan", status: "Aktif" },
        { id: "c9", nama: "CV Pangan Makmur", npwp: "03.444.555.6-099.000", jenisWP: "Badan", email: "admin@panganmakmur.com", telepon: "021-2223334", alamat: "Pasar Induk Kramat Jati, Jakarta Timur", status: "Aktif" },
        { id: "c10", nama: "PT Edukasi Bangsa", npwp: "01.555.666.7-100.000", jenisWP: "Badan", email: "tax@edukasibangsa.co.id", telepon: "021-1112223", alamat: "Jl. Merdeka No. 10, Jakarta Pusat", status: "Aktif" },
    ];

    for (const c of clientsData) {
        await prisma.client.upsert({ where: { id: c.id }, update: {}, create: c });
    }
    console.log("✅ Clients seeded:", clientsData.length);

    // ── Tax Deadlines ─────────────────────────────────────────────────────────
    const today = new Date();
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
    const lastMonth = new Date(today); lastMonth.setMonth(today.getMonth() - 1);

    const deadlines = [
        { id: "d1", jenisPajak: "PPh 21", deskripsi: "Setor PPh 21 Masa Februari", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 10), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses" },
        { id: "d2", jenisPajak: "PPh 21", deskripsi: "Lapor SPT Masa PPh 21 Februari", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 20), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses" },
        { id: "d3", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Februari", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 28), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c2", clientName: "CV Kopi Kenangan Senja" },
        { id: "d4", jenisPajak: "PPh 23", deskripsi: "Setor PPh 23 Masa Januari", tanggalBatas: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10), masaPajak: "Januari 2026", status: "Sudah Lapor", clientId: "c4", clientName: "PT Konstruksi Baja Unggul" },
        { id: "d5", jenisPajak: "PPh 25", deskripsi: "Setor PPh 25 Masa Maret", tanggalBatas: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15), masaPajak: "Maret 2026", status: "Belum Lapor", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses" },
        { id: "d6", jenisPajak: "SPT Tahunan OP", deskripsi: "Lapor SPT Tahunan OP 2025", tanggalBatas: new Date("2026-03-31"), masaPajak: "2025", status: "Belum Lapor", clientId: "c3", clientName: "Dr. Andi Setiawan, Sp.JP" },
        { id: "d7", jenisPajak: "SPT Tahunan OP", deskripsi: "Lapor SPT Tahunan OP 2025", tanggalBatas: new Date("2026-03-31"), masaPajak: "2025", status: "Sudah Lapor", clientId: "c5", clientName: "Siti Rahayu, S.E." },
        { id: "d8", jenisPajak: "SPT Tahunan Badan", deskripsi: "Lapor SPT Tahunan Badan 2025", tanggalBatas: new Date("2026-04-30"), masaPajak: "2025", status: "Belum Lapor", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses" },
        { id: "d9", jenisPajak: "SPT Tahunan Badan", deskripsi: "Lapor SPT Tahunan Badan 2025", tanggalBatas: new Date("2026-04-30"), masaPajak: "2025", status: "Belum Lapor", clientId: "c2", clientName: "CV Kopi Kenangan Senja" },
        { id: "d10", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Maret", tanggalBatas: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 30), masaPajak: "Maret 2026", status: "Belum Lapor", clientId: "c4", clientName: "PT Konstruksi Baja Unggul" },
        { id: "d11", jenisPajak: "PPh 4(2)", deskripsi: "Setor PPh Final Sewa Gedung", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 15), masaPajak: "Februari 2026", status: "Sudah Lapor", clientId: "c6", clientName: "PT Logistik Samudra Mas" },
        { id: "d12", jenisPajak: "PPh 21", deskripsi: "Lapor SPT Masa PPh 21 Februari", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 20), masaPajak: "Februari 2026", status: "Terlambat", clientId: "c7", clientName: "Klinik Estetika Pesona" },
        { id: "d13", jenisPajak: "SPT Tahunan OP", deskripsi: "Lapor SPT Tahunan OP 2025", tanggalBatas: new Date("2026-03-31"), masaPajak: "2025", status: "Belum Lapor", clientId: "c8", clientName: "Ir. Budi Gunawan, M.T." },
        { id: "d14", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Februari", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 28), masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c9", clientName: "CV Pangan Makmur" },
        { id: "d15", jenisPajak: "PPh 23", deskripsi: "Setor PPh 23 atas Jasa Konsultan", tanggalBatas: new Date(today.getFullYear(), today.getMonth(), 10), masaPajak: "Februari 2026", status: "Sudah Lapor", clientId: "c10", clientName: "PT Edukasi Bangsa" },
    ];

    for (const d of deadlines) {
        await prisma.taxDeadline.upsert({ where: { id: d.id }, update: {}, create: d });
    }
    console.log("✅ Tax Deadlines seeded:", deadlines.length);

    // ── Documents ─────────────────────────────────────────────────────────────
    const documents = [
        { id: "doc1", nama: "Faktur Pajak Keluaran 010-24-00001234", kategori: "Faktur Pajak", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses", ukuran: "245 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth() - 1, 15), catatan: "Transaksi ke Telkom" },
        { id: "doc2", nama: "Bukti Potong PPh 23 - Jan 2026", kategori: "Bukti Potong", clientId: "c2", clientName: "CV Kopi Kenangan Senja", ukuran: "128 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth() - 1, 5), catatan: "Bukti potong GrabFood" },
        { id: "doc3", nama: "Draf SPT Tahunan 1770 S - 2025", kategori: "SPT", clientId: "c3", clientName: "Dr. Andi Setiawan, Sp.JP", ukuran: "1.2 MB", tanggalUpload: new Date(today.getFullYear(), today.getMonth(), 2), catatan: "Draf untuk direview klien" },
        { id: "doc4", nama: "Laporan Keuangan Audit 2025", kategori: "Laporan Keuangan", clientId: "c4", clientName: "PT Konstruksi Baja Unggul", ukuran: "3.4 MB", tanggalUpload: new Date(today.getFullYear(), today.getMonth(), 10), catatan: "Audited by KAP Budi & Rekan" },
        { id: "doc5", nama: "Rekening Koran BCA Feb 2026", kategori: "Lainnya", clientId: "c6", clientName: "PT Logistik Samudra Mas", ukuran: "450 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth(), 5), catatan: "Untuk rekonsiliasi PPN" },
        { id: "doc6", nama: "Faktur Masukan Pembelian Alkes", kategori: "Faktur Pajak", clientId: "c7", clientName: "Klinik Estetika Pesona", ukuran: "890 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth() - 1, 20), catatan: "Pembelian mesin laser" },
        { id: "doc7", nama: "Daftar Susut Aktiva Tetap 2025", kategori: "Laporan Keuangan", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses", ukuran: "155 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth(), 1), catatan: "Lampiran SPT Tahunan" },
        { id: "doc8", nama: "NPWP Cabang Bandung", kategori: "Lainnya", clientId: "c10", clientName: "PT Edukasi Bangsa", ukuran: "300 KB", tanggalUpload: new Date(today.getFullYear(), today.getMonth() - 2, 10), catatan: "Dokumen legalitas baru" },
    ];

    for (const doc of documents) {
        await prisma.document.upsert({ where: { id: doc.id }, update: {}, create: doc });
    }
    console.log("✅ Documents seeded:", documents.length);

    // ── Invoices ──────────────────────────────────────────────────────────────
    const invoices = [
        {
            id: "inv1", nomorInvoice: "INV/TAX/26/02/001", clientId: "c1", clientName: "PT Nusantara Teknologi Sukses",
            tanggal: new Date(today.getFullYear(), today.getMonth(), 1), jatuhTempo: new Date(today.getFullYear(), today.getMonth(), 15),
            subtotal: 15000000, ppn: 1650000, total: 16650000, status: "Terkirim", catatan: "Jasa Retainer Pajak Bulanan (Februari)",
            items: [
                { deskripsi: "Jasa Konsultasi & Kepatuhan Pajak (Retainer)", qty: 1, harga: 10000000, jumlah: 10000000 },
                { deskripsi: "Penyusunan SPT Masa PPN & PPh", qty: 1, harga: 5000000, jumlah: 5000000 },
            ],
        },
        {
            id: "inv2", nomorInvoice: "INV/TAX/26/02/002", clientId: "c4", clientName: "PT Konstruksi Baja Unggul",
            tanggal: new Date(today.getFullYear(), today.getMonth() - 1, 20), jatuhTempo: new Date(today.getFullYear(), today.getMonth(), 5),
            subtotal: 35000000, ppn: 3850000, total: 38850000, status: "Lunas", catatan: "Pembayaran via Mandiri",
            items: [
                { deskripsi: "Pendampingan Pemeriksaan Pajak (Tahap 1)", qty: 1, harga: 35000000, jumlah: 35000000 },
            ],
        },
        {
            id: "inv3", nomorInvoice: "INV/TAX/26/02/003", clientId: "c3", clientName: "Dr. Andi Setiawan, Sp.JP",
            tanggal: new Date(today.getFullYear(), today.getMonth(), 5), jatuhTempo: new Date(today.getFullYear(), today.getMonth(), 20),
            subtotal: 3500000, ppn: 385000, total: 3885000, status: "Draft", catatan: "Menunggu approval partner",
            items: [
                { deskripsi: "Penyusunan & Pelaporan SPT Tahunan OP", qty: 1, harga: 3500000, jumlah: 3500000 },
            ],
        },
        {
            id: "inv4", nomorInvoice: "INV/TAX/26/01/014", clientId: "c7", clientName: "Klinik Estetika Pesona",
            tanggal: new Date(today.getFullYear(), today.getMonth() - 1, 15), jatuhTempo: new Date(today.getFullYear(), today.getMonth() - 1, 30),
            subtotal: 8000000, ppn: 880000, total: 8880000, status: "Jatuh Tempo", catatan: "Reminded via WA 3 hari lalu",
            items: [
                { deskripsi: "Jasa Pembukuan (Accounting Service)", qty: 1, harga: 8000000, jumlah: 8000000 },
            ],
        },
        {
            id: "inv5", nomorInvoice: "INV/TAX/26/02/005", clientId: "c2", clientName: "CV Kopi Kenangan Senja",
            tanggal: new Date(today.getFullYear(), today.getMonth(), 10), jatuhTempo: new Date(today.getFullYear(), today.getMonth(), 25),
            subtotal: 5000000, ppn: 550000, total: 5550000, status: "Terkirim", catatan: "",
            items: [
                { deskripsi: "Penyusunan SPT Masa PPN", qty: 1, harga: 5000000, jumlah: 5000000 },
            ],
        },
    ];

    for (const inv of invoices) {
        await prisma.invoice.upsert({
            where: { id: inv.id },
            update: {},
            create: {
                ...inv,
                items: { create: inv.items }
            },
        });
    }
    console.log("✅ Invoices seeded:", invoices.length);

    // ── Permit Types (Templates) ──────────────────────────────────────────────
    const ptBusiness = await prisma.permitType.upsert({
        where: { slug: "business" }, update: {}, create: {
            slug: "business", name: "Perijinan Usaha (NIB)", caseIdPrefix: "NIB", description: "Perijinan usaha melalui sistem OSS RBA", icon: "Briefcase",
            requiredDocs: { create: [{ docType: "KTP Direktur", sortOrder: 0 }, { docType: "NPWP Perusahaan", sortOrder: 1 }, { docType: "Akta Pendirian", sortOrder: 2 }, { docType: "SK Kemenkumham", sortOrder: 3 }] },
            checklistItems: { create: [{ label: "Pemilihan KBLI sudah sesuai realita", sortOrder: 0 }, { label: "Titik koordinat lokasi usaha sudah akurat", sortOrder: 1 }] }
        }
    });

    const ptBuilding = await prisma.permitType.upsert({
        where: { slug: "building" }, update: {}, create: {
            slug: "building", name: "Persetujuan Bangunan Gedung (PBG)", caseIdPrefix: "PBG", description: "Pengganti IMB untuk perizinan mendirikan bangunan", icon: "Building2",
            requiredDocs: { create: [{ docType: "Sertifikat Tanah", sortOrder: 0 }, { docType: "Gambar Rencana Teknis Terverifikasi", sortOrder: 1 }, { docType: "Rekomendasi Tata Ruang (KRK)", sortOrder: 2 }] },
            checklistItems: { create: [{ label: "Dokumen teknis telah disetujui TAB", sortOrder: 0 }, { label: "Bukti lunas retribusi", sortOrder: 1 }] }
        }
    });

    const ptCompany = await prisma.permitType.upsert({
        where: { slug: "company" }, update: {}, create: {
            slug: "company", name: "Pendirian Perusahaan (PT/CV)", caseIdPrefix: "PT", description: "Pengurusan Akta Pendirian, SK, dan NPWP Perusahaan", icon: "Scale",
            requiredDocs: { create: [{ docType: "KTP & NPWP Semua Pendiri", sortOrder: 0 }, { docType: "Surat Keterangan Domisili", sortOrder: 1 }, { docType: "Bukti Setor Modal", sortOrder: 2 }] },
            checklistItems: { create: [{ label: "Nama PT sudah dicek & disetujui", sortOrder: 0 }, { label: "Draft akta dibaca & ditandatangani", sortOrder: 1 }] }
        }
    });

    console.log("✅ Permit Types seeded");

    // ── Permit Cases ──────────────────────────────────────────────────────────
    const permitCases = [
        {
            id: "pc1", caseId: "NIB-2602-001", permitTypeId: ptBusiness.id, clientId: "c1", clientName: "PT Nusantara Teknologi Sukses", advisorId: "admin", serviceType: "Migrasi NIB ke RBA",
            riskCategory: "Menengah Rendah", status: "Processing", progress: 60, feeAmount: 3500000, notes: "Menunggu verifikasi standar lingkungan dari DLH",
            documents: [
                { docType: "KTP Direktur", verificationStatus: "Approved", sortOrder: 0 },
                { docType: "NPWP Perusahaan", verificationStatus: "Approved", sortOrder: 1 },
                { docType: "Akta Pendirian", verificationStatus: "Approved", sortOrder: 2 },
            ],
            checklists: [
                { label: "Pemilihan KBLI sudah sesuai realita", isChecked: true, sortOrder: 0 },
                { label: "Titik koordinat lokasi usaha sudah akurat", isChecked: true, sortOrder: 1 },
            ]
        },
        {
            id: "pc2", caseId: "PBG-2601-042", permitTypeId: ptBuilding.id, clientId: "c6", clientName: "PT Logistik Samudra Mas", advisorId: "admin", serviceType: "Gudang Penyimpanan",
            riskCategory: "Tinggi", status: "Waiting Document", progress: 20, feeAmount: 45000000, notes: "Ditolak karena gambar struktur kurang detail, diminta perbaikan",
            documents: [
                { docType: "Sertifikat Tanah", verificationStatus: "Approved", sortOrder: 0 },
                { docType: "Gambar Rencana Teknis Terverifikasi", verificationStatus: "Rejected", comments: "Hitungan struktur baja lantai 2 tidak valid", sortOrder: 1 },
            ],
            checklists: [
                { label: "Dokumen teknis telah disetujui TAB", isChecked: false, sortOrder: 0 },
            ]
        },
        {
            id: "pc3", caseId: "PT-2602-015", permitTypeId: ptCompany.id, clientId: "c9", clientName: "CV Pangan Makmur", advisorId: "admin", serviceType: "Peningkatan CV menjadi PT",
            riskCategory: "Rendah", status: "Issued", progress: 100, feeAmount: 12000000, notes: "SK Kemenkumham sudah terbit, NPWP sudah aktif",
            documents: [
                { docType: "KTP & NPWP Semua Pendiri", verificationStatus: "Approved", sortOrder: 0 },
                { docType: "Surat Keterangan Domisili", verificationStatus: "Approved", sortOrder: 1 },
            ],
            checklists: [
                { label: "Nama PT sudah dicek & disetujui", isChecked: true, sortOrder: 0 },
                { label: "Draft akta dibaca & ditandatangani", isChecked: true, sortOrder: 1 },
            ]
        },
        {
            id: "pc4", caseId: "NIB-2602-008", permitTypeId: ptBusiness.id, clientId: "c7", clientName: "Klinik Estetika Pesona", advisorId: "admin", serviceType: "Penambahan KBLI Perdagangan Obat",
            riskCategory: "Menengah Tinggi", status: "Draft", progress: 10, feeAmount: 5000000, notes: "Masih mendaftar antrean notaris untuk perubahan akta",
            documents: [], checklists: []
        },
    ];

    for (const pc of permitCases) {
        await prisma.permitCase.upsert({
            where: { id: pc.id },
            update: {},
            create: {
                id: pc.id, caseId: pc.caseId, permitTypeId: pc.permitTypeId, clientId: pc.clientId, clientName: pc.clientName, advisorId: pc.advisorId, serviceType: pc.serviceType, riskCategory: pc.riskCategory, status: pc.status, progress: pc.progress, feeAmount: pc.feeAmount, notes: pc.notes,
                documents: { create: pc.documents },
                checklists: { create: pc.checklists }
            },
        });
    }
    console.log("✅ Permit Cases seeded:", permitCases.length);

    console.log("🎉 Seeding complete! Database is populated with realistic data.");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });