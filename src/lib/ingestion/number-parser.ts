/**
 * Indonesian Number & Date Parser
 *
 * Handles: "1.234.567,89" → 1234567.89, "(1.234)" → -1234,
 *          "Rp 1.000" → 1000, Excel serial dates, dd/mm/yyyy, "1 Januari 2024"
 */

/**
 * Parse Indonesian-format number.
 * "1.234.567,89" → 1234567.89
 * "(1.234.567)"  → -1234567
 * "Rp 1.234"     → 1234
 * "-"            → 0
 */
export function parseIDNumber(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Math.round(value * 100) / 100;

    let str = String(value).trim();
    if (str === "-" || str === "–" || str === "—") return 0;

    // Remove currency prefix
    str = str.replace(/^(Rp\.?\s*|IDR\s*)/i, "");

    // Parentheses = negative
    const isNeg = str.startsWith("(") && str.endsWith(")");
    if (isNeg) str = str.slice(1, -1);

    // Indonesian format: 1.234.567,89 (period=thousands, comma=decimal)
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
        str = str.replace(/\./g, "").replace(",", ".");
    } else if (/^\d+(,\d+)$/.test(str)) {
        // Simple comma-decimal: 1000,50
        str = str.replace(",", ".");
    } else {
        // US format or plain: remove commas
        str = str.replace(/,/g, "");
    }

    str = str.replace(/[^\d.\-]/g, "");
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    return Math.round((isNeg ? -num : num) * 100) / 100;
}

// ── Date Parsing ────────────────────────────────────────────────────────────

const ID_MONTHS: Record<string, string> = {
    jan: "01", januari: "01", feb: "02", februari: "02",
    mar: "03", maret: "03", apr: "04", april: "04",
    mei: "05", may: "05", jun: "06", juni: "06",
    jul: "07", juli: "07", aug: "08", agu: "08", agustus: "08",
    sep: "09", sept: "09", september: "09",
    okt: "10", oct: "10", oktober: "10",
    nov: "11", nop: "11", november: "11",
    des: "12", dec: "12", desember: "12",
};

/**
 * Parse date value → ISO YYYY-MM-DD string.
 * Supports: Excel serial, DD/MM/YYYY, "1 Januari 2024", "Jan-24", ISO.
 */
export function parseIDDate(value: unknown): string | null {
    if (!value) return null;

    // Excel serial date number
    if (typeof value === "number") {
        if (value < 1 || value > 100000) return null;
        const epoch = new Date(1899, 11, 30);
        const date = new Date(epoch.getTime() + value * 86400000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
    }

    const str = String(value).trim();
    if (!str) return null;

    // ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const slashMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (slashMatch) {
        const [, d, m, y] = slashMatch;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // DD-Mon-YY (e.g., "31-Jan-24")
    const shortMatch = str.match(/^(\d{1,2})[/\-.](\w{3,})[/\-.](\d{2,4})$/i);
    if (shortMatch) {
        const [, d, monthStr, yRaw] = shortMatch;
        const m = ID_MONTHS[monthStr.toLowerCase()];
        if (m) {
            const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
            return `${y}-${m}-${d.padStart(2, "0")}`;
        }
    }

    // "1 Januari 2024" or "Januari 2024"
    const longMatch = str.match(/^(\d{1,2})?\s*(\w+)\s+(\d{4})$/i);
    if (longMatch) {
        const [, dRaw, monthStr, y] = longMatch;
        const m = ID_MONTHS[monthStr.toLowerCase()];
        if (m) {
            const d = dRaw ? dRaw.padStart(2, "0") : "01";
            return `${y}-${m}-${d}`;
        }
    }

    // "Jan-24" or "Jan 2024" (month-year only → day 01)
    const myMatch = str.match(/^(\w{3,})[/\-.\s]+(\d{2,4})$/i);
    if (myMatch) {
        const [, monthStr, yRaw] = myMatch;
        const m = ID_MONTHS[monthStr.toLowerCase()];
        if (m) {
            const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
            return `${y}-${m}-01`;
        }
    }

    // Native Date fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return null;
}

/**
 * Extract period string from a cell (e.g., "Januari 2024", "Jan - Dec 2024", etc.)
 * Returns raw string — used for display/tagging, not date parsing.
 */
export function extractPeriod(value: unknown): string {
    if (!value) return "";
    return String(value).trim();
}
