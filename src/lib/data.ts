// Shared types and data for the tax consulting application
import { ClientStatus, JenisWP, TaxDeadlineStatus, DocumentKategori, InvoiceStatus, PermitCaseStatus, PermitPriority, VerificationStatus, AccountType, JournalStatus, AccDocType, AccDocModule } from "@prisma/client";


export interface Client {
    id: string;
    nama: string;
    npwp: string;
    jenisWP: JenisWP;
    email: string;
    telepon: string;
    alamat: string;
    status: ClientStatus;
    createdAt: string;
}

export interface TaxDeadline {
    id: string;
    jenisPajak: string;
    deskripsi: string;
    tanggalBatas: string;
    masaPajak: string;
    status: TaxDeadlineStatus;
    clientId?: string;
    clientName?: string;
}

export interface Document {
    id: string;
    nama: string;
    kategori: DocumentKategori;
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
    status: InvoiceStatus;
    catatan: string;
}

export interface InvoiceItem {
    deskripsi: string;
    qty: number;
    harga: number;
    jumlah: number;
}

// ─── ACCOUNTING SYSTEM ───────────────────────────────────────────────────────

export interface Account {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    description?: string | null;
    isActive: boolean;
    balance: number;
}

export interface JournalEntry {
    id: string;
    reference: string;
    date: string | Date;
    description?: string | null;
    status: JournalStatus;
    clientId: string;
    clientName?: string;
    totalAmount: number;
    items: JournalItem[];
}

export interface JournalItem {
    id: string;
    accountId: string;
    accountName?: string;
    accountCode?: string;
    description?: string | null;
    debit: number;
    credit: number;
}

export interface AccountingDocument {
    id: string;
    documentName: string;
    documentType: AccDocType;
    linkedModule: AccDocModule | null;
    documentDate: string;
    description: string | null;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    clientId: string;
    clientName?: string;
    ocrStatus: string | null;
    ocrData: Record<string, unknown> | null;
    createdAt: string;
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
    priority: PermitPriority;
    feeAmount: number;
    notes?: string;
    deadline?: string | null;
    cancelReason?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    documents?: PermitDocument[];
    checklists?: PermitChecklist[];
    activities?: PermitActivity[];
    comments?: PermitCommentItem[];
    deadlines?: PermitDeadlineItem[];
}

export type PermitStatus = PermitCaseStatus;
export type PermitRiskCategory = "Low" | "Medium-Low" | "Medium-High" | "High";

export interface PermitActivity {
    id: string;
    caseId: string;
    action: string;
    description: string;
    metadata?: Record<string, unknown> | null;
    performedBy?: string | null;
    createdAt: string;
}

export interface PermitCommentItem {
    id: string;
    caseId: string;
    userId: string;
    userName: string;
    userRole: string;
    message: string;
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
    replies?: PermitCommentItem[];
}

export interface PermitDeadlineItem {
    id: string;
    caseId: string;
    label: string;
    dueDate: string;
    completedAt?: string | null;
    createdAt: string;
}

export interface PermitDocument {
    id: string;
    caseId: string;
    docType: string;
    fileUrl?: string;
    verificationStatus: VerificationStatus;
    comments?: string;
    sortOrder: number;
    fileSize?: number | null;
    fileType?: string | null;
    version: number;
    uploadedBy?: string | null;
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
