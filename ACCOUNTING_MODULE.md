# Accounting Module — Claude Code Prompt

Build a complete Accounting module based on a full Indonesian financial reporting
workbook. The workbook has these sheets that must ALL be supported:

1. Cover
2. Buku Besar (General Ledger)
3. Neraca Lajur (Trial Balance / Working Paper)
4. Neraca (Balance Sheet)
5. Ekuitas (Statement of Changes in Equity)
6. Arus Kas (Cash Flow Statement)
7. CALK (Catatan Atas Laporan Keuangan / Notes to Financial Statements)
8. Lamp (Lampiran / Appendix)
9. Piutang (Accounts Receivable Schedule)
10. ATI 1 & ATI 2 (Aset Tetap Inventaris / Fixed Asset Schedule)
11. Utang Usaha (Accounts Payable Schedule)
12. Utang Owner (Owner Loan Schedule)
13. Penjualan (Sales Schedule)

---

## Tech Stack

- Next.js 15 App Router, Server Actions (`"use server"`)
- Prisma + PostgreSQL
- `exceljs` for Excel generation
- `@react-pdf/renderer` for PDF generation
- Existing models: `Client`, `Account`, `JournalEntry`, `JournalItem`, `Invoice`, `Payment`

## Account Structure (from Chart of Accounts)

| Range | Type |
|---|---|
| 100–223 | Asset |
| 300–410 | Liability |
| 510–514 | Equity |
| 600–606, 900–902 | Revenue |
| 620–624 | Cost of Goods Sold |
| 700–729, 910–913 | Expense |

---

## Install Packages First

```bash
npm install exceljs @react-pdf/renderer date-fns
```

---

## 1. Buku Besar (General Ledger)

### Data
For each Account, show all JournalItems in date order:
- Opening balance (saldo awal)
- Each transaction: date, refNumber, description, debit, credit, running balance
- Closing balance (saldo akhir)

### Server Action
```typescript
// src/actions/accounting/buku-besar.ts
getBukuBesar(clientId: string, startDate: Date, endDate: Date, accountCode?: string)
// Returns: per-account ledger with running balance
```

### UI
- Filter by account, date range
- Table: Tanggal | Ref | Keterangan | Debit | Kredit | Saldo
- Running balance column
- Opening and closing balance rows in bold
- Download Excel + PDF per account or all accounts

---

## 2. Neraca Lajur (Trial Balance / Working Paper)

### Data
Aggregate all posted JournalItems by account for the period.
Columns: `KETERANGAN | Chart of Account | Jumlah Rp`

### Sections (in order)
```
ASET
  KAS (100–101)
  BANK (110–114)
  PIUTANG (120–122)
  PERSEDIAAN (130–140)
  ASET TETAP (210–213)
  ASET LAIN-LAIN (220–223)

KEWAJIBAN
  UTANG (300–310)
  UTANG PAJAK (320–321)
  UTANG AFFILIASI (400)
  CADANGAN (410)
  EKUITAS (510–514)

LABA RUGI
  PENDAPATAN (600–606, 900–902)
  BEBAN (620–624, 700–729, 910–913)
```

### Calculations
```
JUMLAH ASET = sum(100–223)
JUMLAH KEWAJIBAN DAN MODAL = sum(300–514)
→ Must be equal (balance check)

LABA RUGI SEBELUM PAJAK = Total Pendapatan - Total Beban
LABA RUGI SETELAH PAJAK = Laba Sebelum Pajak - Pajak (321)
```

---

## 3. Neraca (Balance Sheet)

### Format
Two-column layout: ASET (left) | KEWAJIBAN & EKUITAS (right)

### ASET side
- Aset Lancar: Kas, Bank, Piutang, Persediaan, Biaya Dibayar Dimuka
- Total Aset Lancar
- Aset Tidak Lancar: Aset Tetap net of depreciation, Aset Lain
- Total Aset Tidak Lancar
- **TOTAL ASET**

### KEWAJIBAN & EKUITAS side
- Kewajiban Jangka Pendek: Utang Usaha, Utang Pajak, Utang Lain
- Total Kewajiban Jangka Pendek
- Kewajiban Jangka Panjang: Utang Affiliasi/Owner
- Total Kewajiban
- Ekuitas: Modal, Cadangan, Saldo Laba, Laba Tahun Berjalan
- Total Ekuitas
- **TOTAL KEWAJIBAN & EKUITAS**

### Validation
Show green checkmark if `TOTAL ASET === TOTAL KEWAJIBAN & EKUITAS`, red warning if not.

---

## 4. Ekuitas (Statement of Changes in Equity)

### Format

| Keterangan | Modal Disetor | Cadangan | Saldo Laba | Laba Berjalan | Total |
|---|---|---|---|---|---|
| Saldo Awal | | | | | |
| Penambahan Modal | | | | | |
| Laba/Rugi Tahun Ini | | | | | |
| Dividen/Prive | | | | | |
| **Saldo Akhir** | | | | | |

---

## 5. Arus Kas (Cash Flow Statement — Indirect Method)

### Aktivitas Operasi
- Laba bersih (starting point)
- Add back non-cash: Penyusutan, Amortisasi
- Changes in working capital:
  - (Increase)/Decrease Piutang
  - (Increase)/Decrease Persediaan
  - Increase/(Decrease) Utang Usaha
  - Increase/(Decrease) Utang Pajak
- **Net Cash from Operations**

### Aktivitas Investasi
- Purchase of fixed assets (ATI)
- Proceeds from asset disposal
- **Net Cash from Investing**

### Aktivitas Pendanaan
- Modal disetor / tambahan modal
- Pinjaman owner / utang affiliasi
- Pembayaran dividen / prive
- **Net Cash from Financing**

### Summary
```
Net increase/decrease in cash
+ Cash beginning of period
= Cash end of period  →  must match Kas + Bank in Neraca
```

---

## 6. CALK (Notes to Financial Statements)

Sections to generate:

1. **Umum** — company profile, business activity, reporting period
2. **Kebijakan Akuntansi** — depreciation method, inventory method
3. **Kas dan Setara Kas** — breakdown of cash accounts with balances
4. **Piutang Usaha** — aging schedule
5. **Persediaan** — breakdown by category
6. **Aset Tetap** — movement table: opening + additions - disposals - depreciation = closing
7. **Utang Usaha** — list of creditors with amounts
8. **Perpajakan** — PB1/PHR, PPh details
9. **Pendapatan** — breakdown by revenue type
10. **Beban** — breakdown by expense category

---

## 7. Piutang Schedule (Accounts Receivable)

Data source: `Invoice` model (status != `Lunas`) + `Payment` model

### Table
| No | Nama Pelanggan | No Invoice | Tanggal | Jatuh Tempo | Jumlah | Sudah Dibayar | Sisa | Umur (hari) | Keterangan |

### Aging Buckets
| Bucket | Criteria |
|---|---|
| Current | Belum jatuh tempo |
| 1–30 hari | |
| 31–60 hari | |
| 61–90 hari | |
| > 90 hari | |

Summary row per bucket with totals at the bottom.

---

## 8. ATI 1 & ATI 2 (Fixed Asset Schedule)

### ATI 1 — Asset Movement Table
| Nama Aset | Kode | Saldo Awal | Penambahan | Pengurangan | Saldo Akhir |

Per category: Gedung (210), Inventaris (211)

### ATI 2 — Depreciation Schedule
| Nama Aset | Nilai Perolehan | Akum. Penyusutan Awal | Penyusutan Tahun Ini | Akum. Penyusutan Akhir | Nilai Buku |

Rates: Gedung = 5%/year, Inventaris = 25%/year (straight-line)

---

## 9. Utang Usaha & Utang Owner

### Utang Usaha
| No | Kreditur | Tanggal | Jatuh Tempo | Jumlah | Keterangan |

Aging: Current / 1–30 / 31–60 / >60 hari

### Utang Owner
| Tanggal | Keterangan | Ref | Penambahan | Pembayaran | Saldo |

Show opening balance → all transactions → closing balance.

---

## 10. Penjualan (Sales Schedule)

Data source: `Invoice` model + `InvoiceItem`

### Monthly Summary
| Bulan | Food Restaurant | Beverage Restaurant | Food Banquet | Beverage Banquet | Others | Pajak PB1 | Total |

### Detail View
| Tanggal | No Invoice | Keterangan | Food | Beverage | Others | Pajak | Total |

---

## File Structure to Create

```
src/
  actions/
    accounting/
      buku-besar.ts
      neraca-lajur.ts
      neraca.ts
      ekuitas.ts
      arus-kas.ts
      calk.ts
      piutang-schedule.ts
      ati-schedule.ts
      utang-schedule.ts
      penjualan-schedule.ts
  components/
    accounting/
      AccountingLayout.tsx       ← sidebar nav for all reports
      BukuBesarPage.tsx
      NeracaLajurPage.tsx
      NeracaPage.tsx
      EkuitasPage.tsx
      ArusKasPage.tsx
      CalkPage.tsx
      SchedulePages.tsx
      shared/
        ReportHeader.tsx         ← company name, period, title
        DownloadButtons.tsx      ← Excel + PDF buttons
        AmountCell.tsx           ← format Rp Indonesian style
        BalanceCheck.tsx         ← show balance validation status
  lib/
    accounting/
      types.ts                   ← all TypeScript interfaces
      calculations.ts            ← shared calculation helpers
      excel/
        workbook-builder.ts      ← full multi-sheet Excel builder
        sheet-neraca-lajur.ts
        sheet-neraca.ts
        sheet-buku-besar.ts
        sheet-ekuitas.ts
        sheet-arus-kas.ts
        sheet-calk.ts
        sheet-piutang.ts
        sheet-ati.ts
        sheet-utang.ts
        sheet-penjualan.ts
      pdf/
        pdf-neraca-lajur.tsx
        pdf-neraca.tsx
        pdf-buku-besar.tsx
app/
  dashboard/
    accounting/
      page.tsx
      buku-besar/page.tsx
      neraca-lajur/page.tsx
      neraca/page.tsx
      ekuitas/page.tsx
      arus-kas/page.tsx
      calk/page.tsx
      schedules/
        piutang/page.tsx
        ati/page.tsx
        utang/page.tsx
        penjualan/page.tsx
```

---

## Download Requirements

### Excel — Full Workbook
Single `.xlsx` with ALL sheets matching the original template order:

| # | Sheet |
|---|---|
| 1 | Cover |
| 2 | Buku Besar |
| 3 | Neraca Lajur |
| 4 | Neraca |
| 5 | Ekuitas |
| 6 | Arus Kas |
| 7 | CALK |
| 8 | Piutang |
| 9 | ATI 1 & ATI 2 |
| 10 | Utang Usaha |
| 11 | Utang Owner |
| 12 | Penjualan |

Trigger download in browser:
```typescript
const buffer = Buffer.from(base64, 'base64')
const blob = new Blob([buffer], {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `LaporanKeuangan_${clientName}_${period}.xlsx`
a.click()
URL.revokeObjectURL(url)
```

### PDF — Per Report
Individual PDF per report using `@react-pdf/renderer`.
- A4 portrait: Neraca, Ekuitas, Arus Kas, CALK, Schedules
- A4 landscape: Buku Besar, Neraca Lajur

---

## Formatting Rules

| Rule | Detail |
|---|---|
| Amount format | Indonesian dots: `Rp 1.234.567` |
| Zero | Display as ` - ` |
| Negative | Parentheses: `(Rp 270.495.673)` |
| Date | `dd/MM/yyyy` |
| Section headers | Bold, light blue background `#EFF6FF` |
| Subtotals | Bold, single top border |
| Grand totals | Bold, double top border |
| Indentation | Section 0px → Sub-section 16px → Account 32px → Detail 48px |

---

## Business Rules

- Only include `JournalEntry` with `status = "Posted"` — exclude `Draft`
- Account balance direction:
  - `Asset` / `Expense` → `sum(debit) - sum(credit)`
  - `Liability` / `Equity` / `Revenue` → `sum(credit) - sum(debit)`
- Accounts 212, 213, 221 are contra-assets — always shown as negative/parentheses
- `Laba Rugi Tahun Berjalan` (account 514) = `LABA RUGI SETELAH PAJAK` from income statement
- Cash Flow ending cash must reconcile with `Kas (100–101) + Bank (110–114)` from Neraca
- Handle missing accounts gracefully — not all clients will have all accounts
- Handle zero balances — show ` - ` not `0`
- All server actions return `{ success: boolean, data?: any, error?: string }`
- Use `prisma.$transaction()` for any multi-step writes
- Use `revalidatePath()` after mutations
