// Shared types and data for the tax consulting application

export interface Client {
    id: string;
    nama: string;
    npwp: string;
    jenisWP: "Orang Pribadi" | "Badan";
    email: string;
    telepon: string;
    alamat: string;
    status: "Aktif" | "Tidak Aktif";
    createdAt: string;
}

export interface TaxDeadline {
    id: string;
    jenisPajak: string;
    deskripsi: string;
    tanggalBatas: string;
    masaPajak: string;
    status: "Sudah Lapor" | "Belum Lapor" | "Terlambat";
    clientId?: string;
    clientName?: string;
}

export interface Document {
    id: string;
    nama: string;
    kategori: "Faktur Pajak" | "Bukti Potong" | "SPT" | "Laporan Keuangan" | "Lainnya";
    clientId: string;
    clientName: string;
    ukuran: string;
    tanggalUpload: string;
    catatan: string;
}

export interface Invoice {
    id: string;
    nomorInvoice: string;
    clientId: string;
    clientName: string;
    tanggal: string;
    jatuhTempo: string;
    items: InvoiceItem[];
    subtotal: number;
    ppn: number;
    total: number;
    status: "Draft" | "Terkirim" | "Lunas" | "Jatuh Tempo";
    catatan: string;
}

export interface InvoiceItem {
    deskripsi: string;
    qty: number;
    harga: number;
    jumlah: number;
}

export interface BusinessPermitCase {
    id: string;
    caseId: string;
    clientId: string;
    clientName: string;
    advisorId: string;
    serviceType: "PT" | "CV" | "Individual" | "NIB" | "Sertifikat Standar" | "Operational Permit" | "Amendment";
    riskCategory: "Low" | "Medium-Low" | "Medium-High" | "High";
    status: BusinessPermitStatus;
    progress: number;
    feeAmount: number;
    createdAt: string;
    updatedAt: string;
}

export type BusinessPermitStatus =
    | "Draft"
    | "Waiting Document"
    | "Verification"
    | "Revision Required"
    | "Processing OSS"
    | "Issued"
    | "Completed"
    | "Cancelled"
    | "On Hold";

export interface BusinessPermitDocument {
    id: string;
    caseId: string;
    docType: string;
    fileUrl?: string;
    verificationStatus: "Pending" | "Approved" | "Rejected";
    comments?: string;
}

// Format currency to IDR
export function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Generate a random ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Sample clients data
export const sampleClients: Client[] = [
    {
        id: "c1",
        nama: "PT Maju Bersama",
        npwp: "01.234.567.8-901.000",
        jenisWP: "Badan",
        email: "finance@majubersama.co.id",
        telepon: "021-5551234",
        alamat: "Jl. Sudirman No. 45, Jakarta Selatan",
        status: "Aktif",
        createdAt: "2025-01-15",
    },
    {
        id: "c2",
        nama: "CV Sejahtera Abadi",
        npwp: "02.345.678.9-012.000",
        jenisWP: "Badan",
        email: "admin@sejahteraabadi.com",
        telepon: "021-5559876",
        alamat: "Jl. Gatot Subroto No. 12, Jakarta Pusat",
        status: "Aktif",
        createdAt: "2025-02-20",
    },
    {
        id: "c3",
        nama: "Budi Santoso",
        npwp: "03.456.789.0-123.000",
        jenisWP: "Orang Pribadi",
        email: "budi.santoso@gmail.com",
        telepon: "0812-3456-7890",
        alamat: "Jl. Kemang Raya No. 8, Jakarta Selatan",
        status: "Aktif",
        createdAt: "2025-03-10",
    },
    {
        id: "c4",
        nama: "PT Teknologi Nusantara",
        npwp: "04.567.890.1-234.000",
        jenisWP: "Badan",
        email: "tax@teknusa.co.id",
        telepon: "021-5553456",
        alamat: "Jl. TB Simatupang No. 99, Jakarta Timur",
        status: "Aktif",
        createdAt: "2025-04-05",
    },
    {
        id: "c5",
        nama: "Siti Rahayu",
        npwp: "05.678.901.2-345.000",
        jenisWP: "Orang Pribadi",
        email: "siti.rahayu@yahoo.com",
        telepon: "0813-9876-5432",
        alamat: "Jl. Panglima Polim No. 3, Jakarta Selatan",
        status: "Tidak Aktif",
        createdAt: "2024-11-20",
    },
];

// Sample Business Permit Cases
export const samplePermitCases: BusinessPermitCase[] = [
    {
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
        createdAt: "2026-02-01",
        updatedAt: "2026-02-15",
    },
    {
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
        createdAt: "2026-02-05",
        updatedAt: "2026-02-20",
    },
    {
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
        createdAt: "2026-02-10",
        updatedAt: "2026-02-23",
    }
];

// Sample tax deadlines
export const sampleDeadlines: TaxDeadline[] = [
    { id: "d1", jenisPajak: "PPh 21", deskripsi: "Setor PPh 21 Masa Januari 2026", tanggalBatas: "2026-02-10", masaPajak: "Januari 2026", status: "Sudah Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
    { id: "d2", jenisPajak: "PPh 21", deskripsi: "Lapor SPT Masa PPh 21 Januari 2026", tanggalBatas: "2026-02-20", masaPajak: "Januari 2026", status: "Sudah Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
    { id: "d3", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Januari 2026", tanggalBatas: "2026-02-28", masaPajak: "Januari 2026", status: "Belum Lapor", clientId: "c2", clientName: "CV Sejahtera Abadi" },
    { id: "d4", jenisPajak: "PPh 23", deskripsi: "Setor PPh 23 Masa Januari 2026", tanggalBatas: "2026-02-10", masaPajak: "Januari 2026", status: "Terlambat", clientId: "c4", clientName: "PT Teknologi Nusantara" },
    { id: "d5", jenisPajak: "PPh 25", deskripsi: "Setor PPh 25 Masa Februari 2026", tanggalBatas: "2026-03-15", masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
    { id: "d6", jenisPajak: "SPT Tahunan OP", deskripsi: "Batas Lapor SPT Tahunan Orang Pribadi 2025", tanggalBatas: "2026-03-31", masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c3", clientName: "Budi Santoso" },
    { id: "d7", jenisPajak: "SPT Tahunan OP", deskripsi: "Batas Lapor SPT Tahunan Orang Pribadi 2025", tanggalBatas: "2026-03-31", masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c5", clientName: "Siti Rahayu" },
    { id: "d8", jenisPajak: "SPT Tahunan Badan", deskripsi: "Batas Lapor SPT Tahunan Badan 2025", tanggalBatas: "2026-04-30", masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c1", clientName: "PT Maju Bersama" },
    { id: "d9", jenisPajak: "SPT Tahunan Badan", deskripsi: "Batas Lapor SPT Tahunan Badan 2025", tanggalBatas: "2026-04-30", masaPajak: "Tahun 2025", status: "Belum Lapor", clientId: "c2", clientName: "CV Sejahtera Abadi" },
    { id: "d10", jenisPajak: "PPN", deskripsi: "Setor & Lapor PPN Masa Februari 2026", tanggalBatas: "2026-03-31", masaPajak: "Februari 2026", status: "Belum Lapor", clientId: "c4", clientName: "PT Teknologi Nusantara" },
];

// Sample documents
export const sampleDocuments: Document[] = [
    { id: "doc1", nama: "Faktur Pajak 010-23-00001234", kategori: "Faktur Pajak", clientId: "c1", clientName: "PT Maju Bersama", ukuran: "245 KB", tanggalUpload: "2026-01-15", catatan: "Faktur pajak keluaran Januari" },
    { id: "doc2", nama: "Bukti Potong PPh 23 - Jan 2026", kategori: "Bukti Potong", clientId: "c2", clientName: "CV Sejahtera Abadi", ukuran: "128 KB", tanggalUpload: "2026-02-05", catatan: "Bukti potong dari PT ABC" },
    { id: "doc3", nama: "SPT Tahunan 2024 - Budi Santoso", kategori: "SPT", clientId: "c3", clientName: "Budi Santoso", ukuran: "1.2 MB", tanggalUpload: "2025-03-20", catatan: "SPT 1770 tahun 2024" },
    { id: "doc4", nama: "Laporan Keuangan 2025 - PT Teknologi Nusantara", kategori: "Laporan Keuangan", clientId: "c4", clientName: "PT Teknologi Nusantara", ukuran: "3.4 MB", tanggalUpload: "2026-02-10", catatan: "Neraca & Laba Rugi" },
];

// Sample invoices
export const sampleInvoices: Invoice[] = [
    {
        id: "inv1",
        nomorInvoice: "INV-2026-001",
        clientId: "c1",
        clientName: "PT Maju Bersama",
        tanggal: "2026-01-15",
        jatuhTempo: "2026-02-15",
        items: [
            { deskripsi: "Jasa Konsultasi Pajak - Januari 2026", qty: 1, harga: 5000000, jumlah: 5000000 },
            { deskripsi: "Penyusunan SPT Masa PPN", qty: 1, harga: 2500000, jumlah: 2500000 },
        ],
        subtotal: 7500000,
        ppn: 825000,
        total: 8325000,
        status: "Lunas",
        catatan: "Pembayaran via transfer BCA",
    },
    {
        id: "inv2",
        nomorInvoice: "INV-2026-002",
        clientId: "c2",
        clientName: "CV Sejahtera Abadi",
        tanggal: "2026-02-01",
        jatuhTempo: "2026-03-01",
        items: [
            { deskripsi: "Jasa Konsultasi Pajak - Februari 2026", qty: 1, harga: 3500000, jumlah: 3500000 },
            { deskripsi: "Review Faktur Pajak", qty: 1, harga: 1500000, jumlah: 1500000 },
        ],
        subtotal: 5000000,
        ppn: 550000,
        total: 5550000,
        status: "Terkirim",
        catatan: "",
    },
    {
        id: "inv3",
        nomorInvoice: "INV-2026-003",
        clientId: "c3",
        clientName: "Budi Santoso",
        tanggal: "2026-02-10",
        jatuhTempo: "2026-03-10",
        items: [
            { deskripsi: "Penyusunan SPT Tahunan 1770", qty: 1, harga: 2000000, jumlah: 2000000 },
        ],
        subtotal: 2000000,
        ppn: 220000,
        total: 2220000,
        status: "Draft",
        catatan: "Menunggu kelengkapan dokumen",
    },
    {
        id: "inv4",
        nomorInvoice: "INV-2026-004",
        clientId: "c4",
        clientName: "PT Teknologi Nusantara",
        tanggal: "2026-01-20",
        jatuhTempo: "2026-02-20",
        items: [
            { deskripsi: "Jasa Konsultasi Pajak Bulanan", qty: 1, harga: 8000000, jumlah: 8000000 },
            { deskripsi: "Penyusunan Laporan Keuangan", qty: 1, harga: 5000000, jumlah: 5000000 },
            { deskripsi: "Tax Planning 2026", qty: 1, harga: 10000000, jumlah: 10000000 },
        ],
        subtotal: 23000000,
        ppn: 2530000,
        total: 25530000,
        status: "Jatuh Tempo",
        catatan: "Sudah reminder 2x",
    },
];

// PTKP 2024 values
export const PTKP = {
    TK0: 54000000,
    TK1: 58500000,
    TK2: 63000000,
    TK3: 67500000,
    K0: 58500000,
    K1: 63000000,
    K2: 67500000,
    K3: 72000000,
} as const;

// PPh 21 progressive tax rates (Pasal 17)
export const PPH21_RATES = [
    { min: 0, max: 60000000, rate: 0.05 },
    { min: 60000000, max: 250000000, rate: 0.15 },
    { min: 250000000, max: 500000000, rate: 0.25 },
    { min: 500000000, max: 5000000000, rate: 0.30 },
    { min: 5000000000, max: Infinity, rate: 0.35 },
];

/**
 * Filter data based on client context (Multi-tenancy)
 */

export function getFilteredClients(allClients: Client[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allClients;
    return allClients.filter(c => c.id === clientId);
}

export function getFilteredInvoices(allInvoices: Invoice[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allInvoices;
    return allInvoices.filter(i => i.clientId === clientId);
}

export function getFilteredDeadlines(allDeadlines: TaxDeadline[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allDeadlines;
    return allDeadlines.filter(d => d.clientId === clientId);
}

export function getFilteredDocuments(allDocs: Document[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allDocs;
    return allDocs.filter(doc => doc.clientId === clientId);
}

export function getFilteredPermits(allPermits: BusinessPermitCase[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allPermits;
    return allPermits.filter(p => p.clientId === clientId);
}
