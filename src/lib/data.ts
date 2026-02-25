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

// ─── SCALABLE PERMITS SYSTEM ─────────────────────────────────────────────────

export interface PermitType {
    id: string;
    slug: string;
    name: string;
    caseIdPrefix: string;
    description?: string;
    icon?: string;
    requiredDocs?: PermitTypeDocumentTemplate[];
    checklistItems?: PermitTypeChecklistTemplate[];
}

export interface PermitTypeDocumentTemplate {
    id: string;
    docType: string;
    isRequired: boolean;
    sortOrder: number;
}

export interface PermitTypeChecklistTemplate {
    id: string;
    label: string;
    description?: string;
    sortOrder: number;
}

export interface PermitCase {
    id: string;
    caseId: string;
    permitTypeId: string;
    permitType?: PermitType;
    clientId: string;
    clientName: string;
    advisorId?: string;
    serviceType: string;
    riskCategory: PermitRiskCategory;
    status: PermitStatus;
    progress: number;
    feeAmount: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    documents?: PermitDocument[];
    checklists?: PermitChecklist[];
}

export type PermitRiskCategory = "Low" | "Medium-Low" | "Medium-High" | "High";

export type PermitStatus =
    | "Draft"
    | "Waiting Document"
    | "Verification"
    | "Revision Required"
    | "Processing"
    | "Issued"
    | "Completed"
    | "Cancelled"
    | "On Hold";

export interface PermitDocument {
    id: string;
    caseId: string;
    docType: string;
    fileUrl?: string;
    verificationStatus: "Pending" | "Approved" | "Rejected";
    comments?: string;
    sortOrder: number;
}

export interface PermitChecklist {
    id: string;
    caseId: string;
    label: string;
    description?: string;
    isChecked: boolean;
    checkedAt?: string;
    checkedBy?: string;
    sortOrder: number;
}

// Backward compatibility aliases
export type BusinessPermitCase = PermitCase;
export type BusinessPermitStatus = PermitStatus;
export type BusinessPermitDocument = PermitDocument;

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

// Sample data (empty — all fetched from DB)
export const sampleClients: Client[] = [];
export const samplePermitCases: PermitCase[] = [];
export const sampleDeadlines: TaxDeadline[] = [];
export const sampleDocuments: Document[] = [];
export const sampleInvoices: Invoice[] = [];

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

export function getFilteredPermits(allPermits: PermitCase[], role: "admin" | "client", clientId?: string) {
    if (role === "admin") return allPermits;
    return allPermits.filter(p => p.clientId === clientId);
}
