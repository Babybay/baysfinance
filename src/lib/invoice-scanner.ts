/**
 * Invoice Scanner — extracts structured invoice data from OCR text.
 *
 * Supports Indonesian and English invoice formats. Handles OCR quirks like
 * multi-line label/value pairs, inconsistent spacing, and mixed formats.
 */

export interface ScannedLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface ScannedInvoiceData {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    vendorName: string | null;
    vendorAddress: string | null;
    customerName: string | null;
    lineItems: ScannedLineItem[];
    subtotal: number | null;
    taxAmount: number | null;
    taxRate: number | null;
    grandTotal: number | null;
    currency: string;
    rawText: string;
    confidence: number;
}

// ─── NUMBER PARSING ──────────────────────────────────────────────────────────

function parseNumber(str: string): number | null {
    if (!str) return null;
    let cleaned = str.replace(/[^\d.,\-]/g, "").trim();
    if (!cleaned || cleaned === "." || cleaned === ",") return null;

    // Indonesian: 1.000.000,00 or 1.000.000
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
    // English with commas: 1,000,000.00 or 1,000,000
    else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
        cleaned = cleaned.replace(/,/g, "");
    }
    // Comma decimal: 1000,50
    else if (/^\d+,\d{1,2}$/.test(cleaned)) {
        cleaned = cleaned.replace(",", ".");
    }
    // Single dot thousands: 1.000 — assume thousands for invoice context
    else if (/^\d{1,3}\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "");
    }
    // Mixed or plain digits
    else {
        cleaned = cleaned.replace(/,/g, "").replace(/\.(?=.*\.)/g, "");
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

// ─── DATE PARSING ────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
    januari: "01", februari: "02", maret: "03", april: "04",
    mei: "05", juni: "06", juli: "07", agustus: "08",
    september: "09", oktober: "10", november: "11", desember: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    jun: "06", jul: "07", ags: "08", agu: "08", sep: "09", okt: "10", nov: "11", des: "12",
    january: "01", february: "02", march: "03",
    may: "05", june: "06", july: "07", august: "08",
    october: "10", december: "12",
    aug: "08", oct: "10", dec: "12",
};

function expandYear(y: string): string {
    if (y.length === 4) return y;
    const n = parseInt(y, 10);
    return n >= 0 && n <= 50 ? `20${y.padStart(2, "0")}` : `19${y.padStart(2, "0")}`;
}

function parseDate(str: string): string | null {
    if (!str) return null;
    const s = str.trim();

    // ISO: 2026-03-12
    const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

    // DD-Mon-YY or DD-Mon-YYYY (e.g. "30-Sep-13")
    const dmonY = s.match(/(\d{1,2})[/\-.\s]([A-Za-z]{3,})[/\-.\s](\d{2,4})/);
    if (dmonY) {
        const m = MONTH_MAP[dmonY[2].toLowerCase()];
        if (m) return `${expandYear(dmonY[3])}-${m}-${dmonY[1].padStart(2, "0")}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY (4-digit year)
    const dmy4 = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (dmy4) return `${dmy4[3]}-${dmy4[2].padStart(2, "0")}-${dmy4[1].padStart(2, "0")}`;

    // DD/MM/YY (2-digit year)
    const dmy2 = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})(?!\d)/);
    if (dmy2) return `${expandYear(dmy2[3])}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`;

    // DD Month YYYY
    const named = s.match(/(\d{1,2})\s+(\w+)\s+(\d{2,4})/i);
    if (named) {
        const m = MONTH_MAP[named[2].toLowerCase()];
        if (m) return `${expandYear(named[3])}-${m}-${named[1].padStart(2, "0")}`;
    }

    // Month DD, YYYY
    const mdy = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (mdy) {
        const m = MONTH_MAP[mdy[1].toLowerCase()];
        if (m) return `${mdy[3]}-${m}-${mdy[2].padStart(2, "0")}`;
    }

    return null;
}

/** Find all date-like strings in text */
function findDatesInText(text: string): { raw: string; parsed: string }[] {
    const results: { raw: string; parsed: string }[] = [];
    // Match common date patterns anywhere in text
    const datePatterns = [
        /\d{1,2}[/\-.\s][A-Za-z]{3,}[/\-.\s]\d{2,4}/g,
        /\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4}/g,
        /\d{4}-\d{1,2}-\d{1,2}/g,
    ];
    for (const pat of datePatterns) {
        let m;
        while ((m = pat.exec(text)) !== null) {
            const parsed = parseDate(m[0]);
            if (parsed) results.push({ raw: m[0], parsed });
        }
    }
    return results;
}

// ─── TEXT HELPERS ─────────────────────────────────────────────────────────────

/**
 * Extract a value that may be on the same line as the label or the next line.
 * OCR often puts "Label\nValue" on separate lines.
 */
function extractFieldMultiLine(text: string, labelPatterns: RegExp[]): string | null {
    const lines = text.split("\n");

    for (const pattern of labelPatterns) {
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(pattern);
            if (match) {
                // Check if there's a captured value on the same line
                const sameLineValue = match[1]?.trim();
                if (sameLineValue && sameLineValue.length > 1) {
                    return sameLineValue;
                }
                // Otherwise, check next line
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine && nextLine.length > 1 && nextLine.length < 80) {
                        return nextLine;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Look for a value that appears near a label keyword.
 * Handles formats like "Label  Value" on the same line,
 * or "Label\nValue" on the next line.
 * Returns all nearby values for the caller to filter.
 */
function findNearLabel(text: string, labelPattern: RegExp): string[] {
    const lines = text.split("\n");
    const results: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (labelPattern.test(lines[i])) {
            // Same line: everything after the label
            const afterLabel = lines[i].replace(labelPattern, "").trim();
            if (afterLabel.length > 1) results.push(afterLabel);
            // Next line
            if (i + 1 < lines.length && lines[i + 1].trim().length > 1) {
                results.push(lines[i + 1].trim());
            }
        }
    }
    return results;
}

// ─── FIELD EXTRACTORS ────────────────────────────────────────────────────────

function extractInvoiceNumber(text: string): string | null {
    // Strategy 1: Look for JL/INV/FKT codes anywhere in text
    const codePatterns = [
        /\b(JL\d{4,})\b/i,
        /\b(INV[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(FKT[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(KW[\-/]?[A-Z0-9\-/]{3,})\b/i,
    ];
    for (const pat of codePatterns) {
        const m = text.match(pat);
        if (m) return m[1];
    }

    // Strategy 2: Look near labels (same line or next line)
    const labelCandidates = findNearLabel(text, /(?:no\.?\s*nota|no\.?\s*faktur|no\.?\s*invoice|no\.?\s*kwitansi|no\.?\s*bukti|invoice\s*no)/i);
    for (const c of labelCandidates) {
        // Extract alphanumeric code from the value
        const codeMatch = c.match(/([A-Z0-9][\w\-/]{3,})/i);
        if (codeMatch) return codeMatch[1];
    }

    // Strategy 3: generic "No." label
    const genericMatch = text.match(/(?:no\.?|nomor|number)[:\s]+([A-Z0-9][\w\-/]{3,})/i);
    if (genericMatch) return genericMatch[1];

    return null;
}

function extractInvoiceDate(text: string): string | null {
    // Strategy 1: Find dates near "tanggal" / "date" labels
    const dateCandidates = findNearLabel(text, /(?:tanggal(?:\s*(?:faktur|invoice|nota))?|tgl|invoice\s*date|date)\b/i);
    for (const c of dateCandidates) {
        const parsed = parseDate(c);
        if (parsed) return parsed;
        // The candidate might contain extra text; try to find a date within it
        const dates = findDatesInText(c);
        if (dates.length > 0) return dates[0].parsed;
    }

    // Strategy 2: First date found in the document (often near the top)
    const allDates = findDatesInText(text);
    if (allDates.length > 0) return allDates[0].parsed;

    return null;
}

function extractDueDate(text: string): string | null {
    const candidates = findNearLabel(text, /(?:jatuh\s*tempo|due\s*date|j[./]\s*tempo|tempo)\b/i);
    for (const c of candidates) {
        const parsed = parseDate(c);
        if (parsed) return parsed;
        const dates = findDatesInText(c);
        if (dates.length > 0) return dates[0].parsed;
    }
    return null;
}

function extractVendorName(text: string): string | null {
    // Try explicit labels
    const labeled = extractFieldMultiLine(text, [
        /(?:dari|from|supplier|vendor|penjual|pengirim|diterbitkan\s*oleh)[:\s]*(.*)/i,
    ]);
    if (labeled && labeled.length > 2) return labeled;

    // Look for company name patterns in the first few lines
    const lines = text.split("\n").slice(0, 8);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 3 || trimmed.length > 80) continue;
        if (/^(?:PT|CV|UD|Firma|Toko)\b/i.test(trimmed)) {
            return trimmed.replace(/[|].*$/, "").trim();
        }
        if (/\b(?:Accounting|Consulting|Trading|Indonesia|Corp|Inc|Ltd)\b/i.test(trimmed) && trimmed.length < 60) {
            return trimmed;
        }
    }

    return null;
}

function extractVendorAddress(text: string): string | null {
    const labeled = extractFieldMultiLine(text, [
        /(?:alamat\s*(?:pengirim|vendor|supplier|perusahaan)?|address)[:\s]*(.*)/i,
    ]);
    if (labeled && labeled.length > 5) return labeled;

    // Look for address-like lines near the top
    const lines = text.split("\n").slice(0, 10);
    for (const line of lines) {
        const trimmed = line.trim();
        if (/(?:jl\.|jalan|blok|kel\.|kec\.|kota|jakarta|surabaya|bandung|medan|semarang|yogyakarta|makassar|denpasar|prapatan|raya)/i.test(trimmed)) {
            return trimmed;
        }
    }

    return null;
}

function extractCustomerName(text: string): string | null {
    // Use multi-line approach: "Kepada Yth.:\nCASH"
    const result = extractFieldMultiLine(text, [
        /(?:kepada\s*(?:yth\.?)?)\s*[:\s.]*(.*)/i,
        /(?:bill\s*to|ship\s*to)\s*[:\s.]*(.*)/i,
        /(?:pembeli|customer|pelanggan|penerima)\s*[:\s.]*(.*)/i,
    ]);
    // Filter out garbage (too short, only punctuation, etc.)
    if (result && result.length >= 2 && !/^[:\s.]+$/.test(result)) {
        return result;
    }
    return null;
}

// ─── LINE ITEMS EXTRACTION ───────────────────────────────────────────────────

function isHeaderText(text: string): boolean {
    return /^(no|item|deskripsi|description|uraian|nama|qty|jumlah|harga|total|amount|unit|satuan|disc|diskon)\b/i.test(text);
}

function isSummaryLabel(text: string): boolean {
    return /^(sub\s*total|subtotal|total|pajak|ppn|tax|diskon|discount|grand|nett?o|brut?to|keterangan|catatan|note)\b/i.test(text);
}

function extractLineItems(text: string): ScannedLineItem[] {
    const items: ScannedLineItem[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 10) continue;
        if (isHeaderText(trimmed)) continue;
        if (isSummaryLabel(trimmed)) continue;
        // Skip lines that start with common non-item patterns
        if (/^(?:telp|fax|email|website|keterangan|\d+\.\s*[A-Z])/i.test(trimmed)) continue;

        // Pattern A: "1  1001  Processor Intel i-3  1  UNIT  1,500,000  1,500,000"
        // Starts with row number, optional item code, description, qty, optional unit, price, amount
        const patA = trimmed.match(
            /^(\d+)\s+(?:(\d{3,})\s+)?(.+?)\s+(\d+)\s+(?:[A-Za-z]+\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s+(?:[\d.,]*\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s*$/
        );
        if (patA) {
            const desc = patA[3].trim();
            const qty = parseNumber(patA[4]);
            const price = parseNumber(patA[5]);
            const amount = parseNumber(patA[6]);

            if (desc && amount !== null && amount > 0 && !isHeaderText(desc)) {
                items.push({ description: desc, quantity: qty ?? 1, unitPrice: price ?? amount, amount });
                continue;
            }
        }

        // Pattern B: "1. Processor Intel i-3  1  1,500,000  1,500,000"
        const patB = trimmed.match(
            /^(?:\d+[.\)]\s+)(.+?)\s{2,}(\d+)\s+(?:[A-Za-z]+\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s+(?:[\d.,]*\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s*$/
        );
        if (patB) {
            const desc = patB[1].trim();
            const qty = parseNumber(patB[2]);
            const price = parseNumber(patB[3]);
            const amount = parseNumber(patB[4]);

            if (desc && amount !== null && amount > 0 && !isHeaderText(desc)) {
                items.push({ description: desc, quantity: qty ?? 1, unitPrice: price ?? amount, amount });
                continue;
            }
        }

        // Pattern C: "Description  qty  price  amount" (no leading number)
        const patC = trimmed.match(
            /^([A-Za-z][\w\s/\-()]+?)\s{2,}(\d+)\s+(?:[A-Za-z]+\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s+(?:[\d.,]*\s+)?(?:Rp\.?\s*)?([\d.,]{4,})\s*$/
        );
        if (patC) {
            const desc = patC[1].trim();
            const qty = parseNumber(patC[2]);
            const price = parseNumber(patC[3]);
            const amount = parseNumber(patC[4]);

            if (desc && amount !== null && amount > 0 && !isHeaderText(desc) && !isSummaryLabel(desc)) {
                items.push({ description: desc, quantity: qty ?? 1, unitPrice: price ?? amount, amount });
                continue;
            }
        }
    }

    return items;
}

// ─── TOTALS EXTRACTION ───────────────────────────────────────────────────────

function extractAmountNearLabel(text: string, labelPattern: RegExp): number | null {
    const candidates = findNearLabel(text, labelPattern);
    for (const c of candidates) {
        // Find the largest number in the candidate string
        const numbers: number[] = [];
        const numPattern = /(?:Rp\.?\s*)?([\d.,]{4,})/g;
        let m;
        while ((m = numPattern.exec(c)) !== null) {
            const val = parseNumber(m[1]);
            if (val !== null && val > 0) numbers.push(val);
        }
        if (numbers.length > 0) return Math.max(...numbers);
    }
    return null;
}

function extractSubtotal(text: string): number | null {
    // Match "Subtotal" only at start of a line (not inside table headers like "Harga Disc Subtotal")
    const lines = text.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(?:sub\s*total|subtotal)\b/i.test(trimmed)) {
            const numMatch = trimmed.match(/(?:Rp\.?\s*)?([\d.,]{4,})/);
            if (numMatch) {
                const val = parseNumber(numMatch[1]);
                if (val !== null && val > 0) return val;
            }
        }
    }
    return extractAmountNearLabel(text, /^(?:dpp|dasar\s*pengenaan\s*pajak)\b/im);
}

function extractTax(text: string): number | null {
    return extractAmountNearLabel(text, /(?:pajak|ppn|pph)\s*(?:Rp\.?)?/i)
        ?? extractAmountNearLabel(text, /(?:tax|vat)\s*(?:Rp\.?)?/i);
}

function extractTaxRate(text: string): number | null {
    const m = text.match(/(?:ppn|pajak|tax|vat)\s*[:\s]*(\d{1,2})\s*%/i);
    return m ? parseInt(m[1], 10) : null;
}

function extractGrandTotal(text: string): number | null {
    // Try specific "Total Rp." pattern first (common Indonesian format)
    // Must NOT be "Subtotal"
    const lines = text.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        // Match "Total Rp. 8,580,000" but NOT "Subtotal Rp. 7,800,000"
        if (/^total\s/i.test(trimmed) && !/^sub\s*total/i.test(trimmed)) {
            const numMatch = trimmed.match(/(?:Rp\.?\s*)?([\d.,]{4,})/);
            if (numMatch) {
                const val = parseNumber(numMatch[1]);
                if (val !== null && val > 0) return val;
            }
        }
    }

    return extractAmountNearLabel(text, /(?:grand\s*total|total\s*(?:bayar|pembayaran|keseluruhan|invoice|faktur|tagihan))\b/i)
        ?? extractAmountNearLabel(text, /(?:jumlah\s*(?:yang\s*harus\s*dibayar|tagihan|total)?)\b/i);
}

function detectCurrency(text: string): string {
    if (/\b(USD|\$|US\s*Dollar)\b/i.test(text)) return "USD";
    return "IDR";
}

// ─── CONFIDENCE ──────────────────────────────────────────────────────────────

function calculateConfidence(data: Omit<ScannedInvoiceData, "confidence" | "rawText">): number {
    let score = 0;
    const weights: [boolean, number][] = [
        [!!data.invoiceNumber, 20],
        [!!data.invoiceDate, 15],
        [!!data.vendorName || !!data.customerName, 10],
        [data.lineItems.length > 0, 20],
        [data.grandTotal !== null && data.grandTotal > 0, 20],
        [data.subtotal !== null, 5],
        [data.taxAmount !== null, 5],
        [!!data.dueDate, 5],
    ];

    for (const [cond, weight] of weights) {
        if (cond) score += weight;
    }

    return Math.min(100, score);
}

// ─── SMART TOTAL INFERENCE ───────────────────────────────────────────────────

function inferTotals(data: {
    lineItems: ScannedLineItem[];
    subtotal: number | null;
    taxAmount: number | null;
    grandTotal: number | null;
}) {
    if (data.subtotal === null && data.lineItems.length > 0) {
        data.subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
    }
    if (data.grandTotal === null && data.subtotal !== null) {
        data.grandTotal = data.subtotal + (data.taxAmount ?? 0);
    }
    if (data.taxAmount === null && data.grandTotal !== null && data.subtotal !== null && data.grandTotal > data.subtotal) {
        data.taxAmount = data.grandTotal - data.subtotal;
    }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function parseInvoiceText(rawText: string): ScannedInvoiceData {
    const invoiceNumber = extractInvoiceNumber(rawText);
    const invoiceDate = extractInvoiceDate(rawText);
    const dueDate = extractDueDate(rawText);
    const vendorName = extractVendorName(rawText);
    const vendorAddress = extractVendorAddress(rawText);
    const customerName = extractCustomerName(rawText);
    const lineItems = extractLineItems(rawText);
    let subtotal = extractSubtotal(rawText);
    let taxAmount = extractTax(rawText);
    const taxRate = extractTaxRate(rawText);
    let grandTotal = extractGrandTotal(rawText);
    const currency = detectCurrency(rawText);

    const totals = { lineItems, subtotal, taxAmount, grandTotal };
    inferTotals(totals);
    subtotal = totals.subtotal;
    taxAmount = totals.taxAmount;
    grandTotal = totals.grandTotal;

    const partial = {
        invoiceNumber, invoiceDate, dueDate,
        vendorName, vendorAddress, customerName,
        lineItems, subtotal, taxAmount, taxRate, grandTotal, currency,
    };

    return { ...partial, rawText, confidence: calculateConfidence(partial) };
}
