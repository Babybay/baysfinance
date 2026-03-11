/**
 * Shared types for the accounting import system.
 *
 * The actual parsing logic lives in:
 *   - document-detector.ts  — auto-detect document type
 *   - column-mapper.ts      — fuzzy column matching + account mappings
 *   - document-parser.ts    — universal file parser
 *   - journal-generator.ts  — generate journal entries per document type
 */

export interface ColumnMapping {
    /** Column header in the file (canonical name) */
    column: string;
    /** Account code in the Chart of Accounts */
    accountCode: string;
    /** Account name (for display) */
    accountName: string;
    /** "debit" or "credit" */
    side: "debit" | "credit";
}
