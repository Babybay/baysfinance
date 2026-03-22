/**
 * CSV Export Utility
 *
 * Client-side helper to generate CSV files from data arrays and trigger browser download.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCsv<T extends Record<string, any>>(
    data: T[],
    columns: { key: keyof T; label: string; format?: (val: unknown) => string }[],
    filename: string,
) {
    if (data.length === 0) return;

    const header = columns.map((c) => `"${c.label}"`).join(",");

    const rows = data.map((row) =>
        columns
            .map((col) => {
                const val = row[col.key];
                const formatted = col.format ? col.format(val) : String(val ?? "");
                // Escape quotes in CSV
                return `"${formatted.replace(/"/g, '""')}"`;
            })
            .join(","),
    );

    const csv = [header, ...rows].join("\n");
    const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Format IDR for CSV export (plain number, no Rp prefix) */
export function csvIDR(val: unknown): string {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return num.toLocaleString("id-ID");
}

/** Format date for CSV export */
export function csvDate(val: unknown): string {
    if (!val) return "";
    return new Date(val as string).toLocaleDateString("id-ID");
}
