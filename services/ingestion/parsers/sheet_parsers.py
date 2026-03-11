"""
Sheet parsers for the 9 data sheets in the Bay'sConsult Excel template.

Each parser reads a specific sheet and returns structured data ready for DB insertion.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional, Union
from openpyxl.worksheet.worksheet import Worksheet

from .number_parser import parse_number, safe_decimal, parse_date
from .mapping_reader import MappingEntry, build_column_map, get_column_index


# ── DATA CLASSES ──────────────────────────────────────────────────────────────


@dataclass
class JournalItemData:
    account_code: str
    account_name: str
    debit: float = 0.0
    credit: float = 0.0


@dataclass
class JournalEntryData:
    entry_date: date
    description: str
    source: str
    items: list[JournalItemData] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class FixedAssetData:
    source: str  # "ASET_MANAJEMEN", "ASET_OWNER", "BIAYA_PRA_OPERASI"
    name: str
    acquisition_date: Optional[date] = None
    quantity: int = 1
    depreciation_rate: float = 0.0
    cost_prev: float = 0.0
    mutasi_in: float = 0.0
    mutasi_out: float = 0.0
    cost_current: float = 0.0
    accum_deprec_prev: float = 0.0
    deprec_current_in: float = 0.0
    deprec_current_out: float = 0.0
    accum_deprec_current: float = 0.0
    book_value: float = 0.0


@dataclass
class SheetResult:
    sheet_name: str
    entries: list[JournalEntryData] = field(default_factory=list)
    assets: list[FixedAssetData] = field(default_factory=list)
    snapshot: Optional[dict] = None
    snapshot_type: Optional[str] = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    rows_processed: int = 0
    rows_skipped: int = 0


def _cell(ws: Worksheet, row: int, col: int):
    """Get raw cell value."""
    return ws.cell(row=row, column=col).value


def _cell_num(ws: Worksheet, row: int, col: int) -> float:
    """Get cell value as parsed number."""
    return parse_number(_cell(ws, row, col))


def _cell_str(ws: Worksheet, row: int, col: int) -> str:
    """Get cell value as string."""
    val = _cell(ws, row, col)
    return str(val).strip() if val is not None else ""


# ── SHEET 1: LAPORAN PENJUALAN ────────────────────────────────────────────────


def parse_laporan_penjualan(
    ws: Worksheet, mapping: list[MappingEntry]
) -> SheetResult:
    """
    Parse daily cashier report (sheet 1_LAPORAN_PENJUALAN).
    Header row: 5, data rows: 6–36, total row: 37 (skip).
    One JournalEntry per day.
    """
    result = SheetResult(sheet_name="1_LAPORAN_PENJUALAN")
    col_map = build_column_map(ws, 5, mapping)

    # Build mapping lookup by col_name
    mapping_by_col = {m.col_name: m for m in mapping}

    # Columns that should be merged into one line
    compliment_cols = ["COMPLIMENT VOUCHER", "COMPLIMENT BAND"]

    for row in range(6, 37):
        # Read date from col B (column 2)
        raw_date = _cell(ws, row, 2)
        entry_date = parse_date(raw_date)
        if not entry_date:
            result.rows_skipped += 1
            continue

        items: list[JournalItemData] = []
        compliment_total = 0.0

        for m_entry in mapping:
            if m_entry.side == "SKIP":
                continue

            col_idx = col_map.get(m_entry.col_name)
            if col_idx is None:
                continue

            value = _cell_num(ws, row, col_idx)
            if value == 0:
                continue

            # Merge compliment columns
            if m_entry.col_name in compliment_cols:
                compliment_total += value
                continue

            item = JournalItemData(
                account_code=m_entry.account_code,
                account_name=m_entry.account_name,
            )
            if m_entry.side == "DEBIT":
                item.debit = value
            else:
                item.credit = value
            items.append(item)

        # Add merged compliment line
        if compliment_total > 0:
            comp_mapping = mapping_by_col.get("COMPLIMENT VOUCHER")
            if comp_mapping:
                items.append(JournalItemData(
                    account_code=comp_mapping.account_code,
                    account_name=comp_mapping.account_name,
                    debit=compliment_total,
                ))

        if not items:
            result.rows_skipped += 1
            continue

        # Validate balance
        total_debit = sum(i.debit for i in items)
        total_credit = sum(i.credit for i in items)
        diff = abs(total_debit - total_credit)
        entry = JournalEntryData(
            entry_date=entry_date,
            description=f"Laporan Penjualan {entry_date.strftime('%d/%m/%Y')}",
            source="LAPORAN_PENJUALAN",
            items=items,
        )
        if diff > 1:
            warning = f"Row {row}: Selisih Debit ({total_debit:,.0f}) vs Kredit ({total_credit:,.0f}) = {diff:,.0f}"
            entry.warnings.append(warning)
            result.warnings.append(warning)

        result.entries.append(entry)
        result.rows_processed += 1

    return result


# ── SHEET 2: PIUTANG LAIN-LAIN ───────────────────────────────────────────────


def parse_piutang_lain_lain(ws: Worksheet) -> SheetResult:
    """
    Parse other receivables (sheet 2_PIUTANG_LAIN_LAIN).
    Header row: 5, data rows: 6–25, total row: 26 (skip).
    """
    result = SheetResult(sheet_name="2_PIUTANG_LAIN_LAIN")

    for row in range(6, 26):
        keterangan = _cell_str(ws, row, 3)  # col C
        if not keterangan:
            result.rows_skipped += 1
            continue

        raw_date = _cell(ws, row, 2)  # col B
        entry_date = parse_date(raw_date)
        if not entry_date:
            result.rows_skipped += 1
            continue

        amount = _cell_num(ws, row, 4)  # col D (TOTAL/CASH)
        if amount == 0:
            result.rows_skipped += 1
            continue

        entry = JournalEntryData(
            entry_date=entry_date,
            description=keterangan,
            source="PIUTANG_LAIN_LAIN",
            items=[
                JournalItemData(account_code="1201", account_name="Piutang Lain-Lain", debit=amount),
                JournalItemData(account_code="1101", account_name="Kas Tunai", credit=amount),
            ],
        )
        result.entries.append(entry)
        result.rows_processed += 1

    return result


# ── SHEETS 3/4: ASET TETAP ───────────────────────────────────────────────────


def parse_aset_tetap(ws: Worksheet, source: str) -> SheetResult:
    """
    Parse fixed asset sheets (3_ASET_MANAJEMEN or 4_ASET_OWNER).
    Header row: 6, data rows: 7–56, total row: 57 (skip).
    Returns asset records + one summary depreciation journal entry.
    """
    result = SheetResult(sheet_name=source)

    total_deprec = 0.0
    assets = []

    for row in range(7, 57):
        name = _cell_str(ws, row, 2)  # col B
        if not name:
            result.rows_skipped += 1
            continue

        asset = FixedAssetData(
            source=source,
            name=name,
            acquisition_date=parse_date(_cell(ws, row, 3)),  # col C
            quantity=int(_cell_num(ws, row, 4)) or 1,  # col D
            depreciation_rate=_cell_num(ws, row, 5),  # col E
            cost_prev=_cell_num(ws, row, 6),  # col F
            mutasi_in=_cell_num(ws, row, 7),  # col G
            mutasi_out=_cell_num(ws, row, 8),  # col H
            cost_current=_cell_num(ws, row, 9),  # col I
            accum_deprec_prev=_cell_num(ws, row, 10),  # col J
            deprec_current_in=_cell_num(ws, row, 11),  # col K
            deprec_current_out=_cell_num(ws, row, 12),  # col L
            accum_deprec_current=_cell_num(ws, row, 13),  # col M
            book_value=_cell_num(ws, row, 14),  # col N
        )
        assets.append(asset)
        total_deprec += asset.deprec_current_in
        result.rows_processed += 1

    result.assets = assets

    # Summary depreciation journal entry
    if total_deprec > 0:
        if source == "ASET_MANAJEMEN":
            debit_code, debit_name = "5701", "Beban Penyusutan Inventaris"
            credit_code, credit_name = "1511", "Akm. Penyusutan Inventaris"
        else:
            debit_code, debit_name = "5701", "Beban Penyusutan Inventaris (Owner)"
            credit_code, credit_name = "1512", "Akm. Penyusutan (Owner)"

        entry = JournalEntryData(
            entry_date=date.today(),  # Will be overridden by period
            description=f"Penyusutan Aset Tetap {source}",
            source=source,
            items=[
                JournalItemData(account_code=debit_code, account_name=debit_name, debit=total_deprec),
                JournalItemData(account_code=credit_code, account_name=credit_name, credit=total_deprec),
            ],
        )
        result.entries.append(entry)

    return result


# ── SHEET 5: BIAYA PRA OPERASI ────────────────────────────────────────────────


def parse_biaya_pra_operasi(ws: Worksheet) -> SheetResult:
    """
    Parse pre-operation costs (sheet 5_BIAYA_PRA_OPERASI).
    Header row: 5, data rows: 6–55, total row: 56 (skip).
    """
    result = SheetResult(sheet_name="5_BIAYA_PRA_OPERASI")

    total_amortization = 0.0
    assets = []

    for row in range(6, 56):
        name = _cell_str(ws, row, 2)  # col B
        if not name:
            result.rows_skipped += 1
            continue

        asset = FixedAssetData(
            source="BIAYA_PRA_OPERASI",
            name=name,
            acquisition_date=parse_date(_cell(ws, row, 3)),  # col C
            quantity=int(_cell_num(ws, row, 4)) or 1,  # col D
            depreciation_rate=_cell_num(ws, row, 5),  # col E
            cost_prev=_cell_num(ws, row, 6),  # col F
            mutasi_in=_cell_num(ws, row, 7),  # col G
            mutasi_out=_cell_num(ws, row, 8),  # col H
            cost_current=_cell_num(ws, row, 9),  # col I
            accum_deprec_prev=_cell_num(ws, row, 10),  # col J
            deprec_current_in=_cell_num(ws, row, 11),  # col K (beban amortisasi +)
            deprec_current_out=_cell_num(ws, row, 12),  # col L
            accum_deprec_current=_cell_num(ws, row, 13),  # col M
            book_value=_cell_num(ws, row, 14),  # col N
        )
        assets.append(asset)
        total_amortization += asset.deprec_current_in
        result.rows_processed += 1

    result.assets = assets

    if total_amortization > 0:
        entry = JournalEntryData(
            entry_date=date.today(),
            description="Amortisasi Biaya Pra Operasi",
            source="BIAYA_PRA_OPERASI",
            items=[
                JournalItemData(account_code="5702", account_name="Beban Amortisasi", debit=total_amortization),
                JournalItemData(account_code="1611", account_name="Akm. Amortisasi Pra Operasi", credit=total_amortization),
            ],
        )
        result.entries.append(entry)

    return result


# ── SHEET 6: HUTANG USAHA ─────────────────────────────────────────────────────


def parse_hutang_usaha(ws: Worksheet) -> SheetResult:
    """
    Parse trade payables (sheet 6_HUTANG_USAHA).
    Header row: 5, data rows: 6–25, total row: 26 (skip).
    """
    result = SheetResult(sheet_name="6_HUTANG_USAHA")

    for row in range(6, 26):
        keterangan = _cell_str(ws, row, 2)  # col B (supplier name)
        if not keterangan:
            result.rows_skipped += 1
            continue

        pos = _cell_str(ws, row, 3).upper()  # col C (POS/DEPARTEMEN)
        amount = _cell_num(ws, row, 4)  # col D (TOTAL/CASH)
        if amount == 0:
            result.rows_skipped += 1
            continue

        # Determine expense account by POS
        if "BAR" in pos:
            expense_code, expense_name = "5801", "Beban Bahan Baku Bar"
        elif "KITCHEN" in pos or "DAPUR" in pos:
            expense_code, expense_name = "5802", "Beban Bahan Baku Kitchen"
        else:
            expense_code, expense_name = "5899", "Beban Pembelian Lainnya"

        entry = JournalEntryData(
            entry_date=date.today(),  # Payable entries use period date
            description=f"Hutang Usaha — {keterangan}",
            source="HUTANG_USAHA",
            items=[
                JournalItemData(account_code=expense_code, account_name=expense_name, debit=amount),
                JournalItemData(account_code="2101", account_name="Hutang Usaha", credit=amount),
            ],
        )
        result.entries.append(entry)
        result.rows_processed += 1

    return result


# ── SHEET 7: HUTANG OWNER ─────────────────────────────────────────────────────


def parse_hutang_owner(ws: Worksheet) -> SheetResult:
    """
    Parse owner loans (sheet 7_HUTANG_OWNER).
    Header row: 5, data rows: 6–25, total row: 26 (skip).
    """
    result = SheetResult(sheet_name="7_HUTANG_OWNER")

    for row in range(6, 26):
        keterangan = _cell_str(ws, row, 3)  # col C
        if not keterangan:
            result.rows_skipped += 1
            continue

        raw_date = _cell(ws, row, 2)  # col B
        entry_date = parse_date(raw_date)
        if not entry_date:
            result.rows_skipped += 1
            continue

        amount = _cell_num(ws, row, 4)  # col D (TOTAL)
        if amount == 0:
            result.rows_skipped += 1
            continue

        entry = JournalEntryData(
            entry_date=entry_date,
            description=keterangan,
            source="HUTANG_OWNER",
            items=[
                JournalItemData(account_code="1101", account_name="Kas/Bank", debit=amount),
                JournalItemData(account_code="3201", account_name="Modal/Hutang Owner", credit=amount),
            ],
        )
        result.entries.append(entry)
        result.rows_processed += 1

    return result


# ── SHEET 8: LABA RUGI ────────────────────────────────────────────────────────


def parse_laba_rugi(ws: Worksheet) -> SheetResult:
    """
    Parse profit & loss report (sheet 8_LABA_RUGI).
    This is a SUMMARY REPORT — does NOT generate JournalEntries.
    Stores as FinancialReportSnapshot.
    """
    result = SheetResult(sheet_name="8_LABA_RUGI")

    row_labels = {
        7: "pendapatan_makanan_minuman",
        8: "pendapatan_lainnya",
        9: "discount",
        10: "pajak_restaurant",
        14: "hpp_makanan_minuman",
        15: "hpp_lain",
        21: "beban_tenaga_kerja",
        22: "beban_admin_umum",
        23: "beban_penyusutan_amortisasi",
        24: "beban_lainnya",
        30: "pendapatan_non_operasional",
        31: "beban_non_operasional",
        35: "taksiran_pajak_penghasilan",
        37: "laba_rugi_bersih",
    }

    snapshot = {}
    for row_num, key in row_labels.items():
        snapshot[key] = {
            "label": _cell_str(ws, row_num, 1),  # col A — description
            "current": _cell_num(ws, row_num, 2),  # col B — current period
            "previous": _cell_num(ws, row_num, 3),  # col C — previous period
        }

    result.snapshot = snapshot
    result.snapshot_type = "LABA_RUGI"
    result.rows_processed = len(row_labels)

    return result


# ── SHEET 9: ARUS KAS ─────────────────────────────────────────────────────────


def parse_arus_kas(ws: Worksheet) -> SheetResult:
    """
    Parse cash flow statement (sheet 9_ARUS_KAS).
    This is a SUMMARY REPORT — does NOT generate JournalEntries.
    Stores as FinancialReportSnapshot.
    """
    result = SheetResult(sheet_name="9_ARUS_KAS")

    row_labels = {
        8: "laba_rugi_bersih",
        10: "penyusutan_aset_tetap",
        11: "amortisasi_aset_lain",
        14: "piutang_usaha",
        15: "piutang_lain_lain",
        16: "piutang_afiliasi",
        17: "persediaan",
        18: "utang_usaha",
        19: "utang_lain_lain",
        20: "utang_pajak",
        21: "utang_afiliasi",
        22: "cadangan",
        23: "kas_bersih_operasi",
        26: "aset_tetap_inventaris",
        27: "aset_lain_lain",
        28: "kas_bersih_investasi",
        31: "modal_disetor",
        32: "cadangan_pendanaan",
        33: "prive",
        34: "saldo_laba",
        35: "kas_bersih_pendanaan",
        37: "kenaikan_bersih_kas",
        38: "kas_awal_tahun",
        39: "kas_akhir_tahun",
    }

    snapshot = {}
    for row_num, key in row_labels.items():
        snapshot[key] = {
            "label": _cell_str(ws, row_num, 1),
            "current": _cell_num(ws, row_num, 2),
            "previous": _cell_num(ws, row_num, 3),
        }

    result.snapshot = snapshot
    result.snapshot_type = "ARUS_KAS"
    result.rows_processed = len(row_labels)

    return result
