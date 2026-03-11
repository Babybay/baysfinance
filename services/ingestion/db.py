"""
Database module — direct PostgreSQL writes via psycopg2.
Shares the same DATABASE_URL as the Next.js Prisma client.
"""

import uuid
import json
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import psycopg2
import psycopg2.extras
from config import settings


def get_connection():
    """Get a new database connection."""
    return psycopg2.connect(settings.database_url)


def generate_cuid() -> str:
    """Generate a cuid-like ID compatible with Prisma's @default(cuid())."""
    return "py" + uuid.uuid4().hex[:23]


# ── IMPORT BATCH ──────────────────────────────────────────────────────────────


def create_import_batch(
    conn,
    client_id: str,
    file_name: str,
    period: str,
    company_name: str,
    imported_by: str,
) -> str:
    """Create an ImportBatch record and return its ID."""
    batch_id = generate_cuid()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO import_batches
                (id, "clientId", "fileName", "documentType", period, "companyName",
                 status, "entriesCount", "skippedCount", "errorsCount", "importedBy",
                 "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, 0, 0, 0, %s, %s)
            """,
            (
                batch_id, client_id, file_name, "TEMPLATE_EXCEL",
                period, company_name, "PROCESSING", imported_by,
                datetime.utcnow(),
            ),
        )
    return batch_id


def update_import_batch(
    conn,
    batch_id: str,
    status: str,
    entries_count: int = 0,
    skipped_count: int = 0,
    errors_count: int = 0,
    warnings: Optional[list] = None,
):
    """Update ImportBatch with results."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE import_batches SET
                status = %s,
                "entriesCount" = %s,
                "skippedCount" = %s,
                "errorsCount" = %s,
                warnings = %s,
                "completedAt" = %s
            WHERE id = %s
            """,
            (
                status, entries_count, skipped_count, errors_count,
                json.dumps(warnings) if warnings else None,
                datetime.utcnow(), batch_id,
            ),
        )


# ── JOURNAL ENTRIES ───────────────────────────────────────────────────────────


def get_next_ref_number(conn, prefix: str) -> str:
    """Atomically get next sequential ref number using permit_counters table."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO permit_counters (id, counter)
            VALUES (%s, 1)
            ON CONFLICT (id) DO UPDATE
                SET counter = permit_counters.counter + 1
            RETURNING counter
            """,
            (prefix,),
        )
        counter = cur.fetchone()[0]
        return f"{prefix}-{str(counter).zfill(4)}"


def insert_journal_entry(
    conn,
    client_id: str,
    batch_id: str,
    entry_date: date,
    description: str,
    source: str,
    items: list[dict],  # [{account_code, debit, credit}]
) -> Optional[str]:
    """
    Insert a JournalEntry with JournalItems.
    Resolves account_code → account_id from the accounts table.
    Returns entry ID or None if validation fails.
    """
    if not items:
        return None

    # Resolve account codes → IDs
    codes = list(set(item["account_code"] for item in items))
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT code, id FROM accounts
            WHERE code = ANY(%s)
              AND ("clientId" = %s OR "clientId" IS NULL)
              AND "deletedAt" IS NULL
            """,
            (codes, client_id),
        )
        code_to_id = {row[0]: row[1] for row in cur.fetchall()}

    # Auto-create missing accounts
    for item in items:
        code = item["account_code"]
        if code not in code_to_id:
            account_id = generate_cuid()
            acc_type = _infer_account_type(code)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO accounts (id, code, name, type, "isActive", "clientId", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, true, %s, %s, %s)
                    ON CONFLICT (code, "clientId") DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                    """,
                    (
                        account_id, code, item.get("account_name", f"Akun {code}"),
                        acc_type, client_id, datetime.utcnow(), datetime.utcnow(),
                    ),
                )
                result = cur.fetchone()
                code_to_id[code] = result[0] if result else account_id

    # Calculate totals
    total_debit = sum(Decimal(str(i.get("debit", 0))) for i in items)
    total_credit = sum(Decimal(str(i.get("credit", 0))) for i in items)

    # Generate ref number
    date_str = entry_date.strftime("%Y%m")
    ref_prefix = f"IMP-{date_str}"
    ref_number = get_next_ref_number(conn, ref_prefix)

    entry_id = generate_cuid()

    with conn.cursor() as cur:
        # Insert JournalEntry
        cur.execute(
            """
            INSERT INTO journal_entries
                (id, "refNumber", date, description, status, "clientId",
                 "totalDebit", "totalCredit", source, "importBatchId",
                 "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                entry_id, ref_number, entry_date, description, "Posted",
                client_id, total_debit, total_credit, source, batch_id,
                datetime.utcnow(), datetime.utcnow(),
            ),
        )

        # Insert JournalItems
        item_rows = []
        for item in items:
            account_id = code_to_id.get(item["account_code"])
            if not account_id:
                continue
            item_rows.append((
                generate_cuid(),
                entry_id,
                account_id,
                Decimal(str(item.get("debit", 0))),
                Decimal(str(item.get("credit", 0))),
                datetime.utcnow(),
                datetime.utcnow(),
            ))

        if item_rows:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO journal_items
                    (id, "journalEntryId", "accountId", debit, credit, "createdAt", "updatedAt")
                VALUES %s
                """,
                item_rows,
            )

    return entry_id


def check_duplicate_entry(conn, client_id: str, source: str, entry_date: date) -> bool:
    """Check if a journal entry already exists for this client+source+date."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM journal_entries
            WHERE "clientId" = %s AND source = %s AND date = %s AND "deletedAt" IS NULL
            """,
            (client_id, source, entry_date),
        )
        return cur.fetchone()[0] > 0


# ── FIXED ASSETS ──────────────────────────────────────────────────────────────


def insert_fixed_asset(conn, client_id: str, batch_id: str, asset: dict) -> str:
    """Insert a FixedAsset record."""
    asset_id = generate_cuid()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO fixed_assets
                (id, "clientId", "importBatchId", source, name,
                 "acquisitionDate", quantity, "depreciationRate",
                 "costPrev", "mutasiIn", "mutasiOut", "costCurrent",
                 "accumDeprecPrev", "deprecCurrentIn", "deprecCurrentOut",
                 "accumDeprecCurrent", "bookValue", "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                asset_id, client_id, batch_id,
                asset["source"], asset["name"],
                asset.get("acquisition_date"),
                asset.get("quantity", 1),
                Decimal(str(asset.get("depreciation_rate", 0))),
                Decimal(str(asset.get("cost_prev", 0))),
                Decimal(str(asset.get("mutasi_in", 0))),
                Decimal(str(asset.get("mutasi_out", 0))),
                Decimal(str(asset.get("cost_current", 0))),
                Decimal(str(asset.get("accum_deprec_prev", 0))),
                Decimal(str(asset.get("deprec_current_in", 0))),
                Decimal(str(asset.get("deprec_current_out", 0))),
                Decimal(str(asset.get("accum_deprec_current", 0))),
                Decimal(str(asset.get("book_value", 0))),
                datetime.utcnow(),
            ),
        )
    return asset_id


# ── FINANCIAL REPORT SNAPSHOTS ────────────────────────────────────────────────


def upsert_financial_snapshot(
    conn, client_id: str, period: str, report_type: str, data: dict
):
    """Upsert a FinancialReportSnapshot (unique by clientId+period+reportType)."""
    snapshot_id = generate_cuid()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO financial_report_snapshots
                (id, "clientId", period, "reportType", data, "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT ("clientId", period, "reportType") DO UPDATE
                SET data = EXCLUDED.data
            """,
            (snapshot_id, client_id, period, report_type, json.dumps(data), datetime.utcnow()),
        )


# ── ROLLBACK ──────────────────────────────────────────────────────────────────


def rollback_batch(conn, batch_id: str):
    """Soft-delete all entries, assets, and mark batch as rolled back."""
    now = datetime.utcnow()
    with conn.cursor() as cur:
        # Soft-delete journal items via entries
        cur.execute(
            """
            UPDATE journal_items SET "updatedAt" = %s
            WHERE "journalEntryId" IN (
                SELECT id FROM journal_entries WHERE "importBatchId" = %s
            )
            """,
            (now, batch_id),
        )
        # Soft-delete journal entries
        cur.execute(
            'UPDATE journal_entries SET "deletedAt" = %s WHERE "importBatchId" = %s',
            (now, batch_id),
        )
        # Soft-delete fixed assets
        cur.execute(
            'UPDATE fixed_assets SET "deletedAt" = %s WHERE "importBatchId" = %s',
            (now, batch_id),
        )
        # Mark batch as rolled back
        cur.execute(
            "UPDATE import_batches SET status = 'ROLLED_BACK' WHERE id = %s",
            (batch_id,),
        )


# ── HELPERS ───────────────────────────────────────────────────────────────────


def _infer_account_type(code: str) -> str:
    """Infer AccountType enum from Indonesian CoA code prefix."""
    if not code:
        return "Expense"
    first = code[0]
    if first == "1":
        return "Asset"
    elif first == "2":
        return "Liability"
    elif first == "3":
        return "Equity"
    elif first == "4":
        return "Revenue"
    else:
        return "Expense"


def get_import_batches(conn, client_id: str) -> list[dict]:
    """Get import history for a client."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, "fileName", "documentType", period, "companyName", status,
                   "entriesCount", "skippedCount", "errorsCount", warnings,
                   "importedBy", "completedAt", "createdAt"
            FROM import_batches
            WHERE "clientId" = %s AND "deletedAt" IS NULL
            ORDER BY "createdAt" DESC
            """,
            (client_id,),
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
