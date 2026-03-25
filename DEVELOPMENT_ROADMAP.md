# BaysConsult — Development Roadmap

Dokumen ini berisi rekomendasi pengembangan fitur berdasarkan hasil **audit profesional** terhadap module accounting BaysConsult. Temuan dikelompokkan berdasarkan prioritas dan effort, dengan referensi file yang perlu diubah.

> **Terakhir diperbarui:** 26 Maret 2026
> **Auditor:** Senior Finance & Technology Consultant
> **Status:** Living document — update setelah setiap item selesai

---

## Daftar Isi

- [Status Overview](#status-overview)
- [Phase 1: Critical Bugs](#phase-1-critical-bugs--harus-diperbaiki-sebelum-production)
- [Phase 2: Data Integrity & Accounting Logic](#phase-2-data-integrity--accounting-logic)
- [Phase 3: UX/UI Improvements](#phase-3-uxui-improvements)
- [Phase 4: Feature Completeness](#phase-4-feature-completeness)
- [Phase 5: Professional Polish](#phase-5-professional-polish)
- [Hal yang Sudah Bagus](#hal-yang-sudah-bagus)
- [Catatan Arsitektur](#catatan-arsitektur)

---

## Status Overview

| Phase | Items | Status | Effort |
|-------|-------|--------|--------|
| Phase 1 — Critical Bugs | 4 item | ✅ Selesai | ~15 jam |
| Phase 2 — Data Integrity | 6 item | 🔴 Belum | ~19 jam |
| Phase 3 — UX/UI | 6 item | 🟡 Partial | ~22 jam |
| Phase 4 — Feature Completeness | 5 item | 🔴 Belum | ~48 jam |
| Phase 5 — Professional Polish | 4 item | 🔴 Belum | ~24 jam |
| **Total** | **25 item** | | **~128 jam** |

---

## Phase 1: Critical Bugs — Harus Diperbaiki Sebelum Production

### 1.1 Fix Parameter Order `getFinancialReports`

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Effort** | 30 menit |
| **Status** | ✅ Selesai |

**Problem:**
`getFinancialReports(clientId, endDate, startDate?)` memiliki urutan parameter yang **kebalikan dari konvensi** (`startDate, endDate`). Sementara `getCashFlowReport(clientId, startDate, endDate)` mengikuti konvensi normal. Inkonsistensi ini adalah time bomb bagi developer lain.

**File yang perlu diubah:**
- `src/app/actions/accounting.ts` — Ubah signature menjadi `(clientId, startDate, endDate)`
- `src/app/dashboard/accounting/reports/ReportsView.tsx:30` — Sesuaikan calling order
- `src/app/api/accounting/reports/` — Jika ada endpoint yang memanggil, sesuaikan

**Solusi:**
```typescript
// BEFORE (bahaya — urutan tidak standar)
export async function getFinancialReports(
    clientId: string,
    endDate: Date = new Date(),
    startDate?: Date
)

// AFTER (standar — startDate lalu endDate)
export async function getFinancialReports(
    clientId: string,
    startDate: Date,
    endDate: Date = new Date()
)
```

**Verifikasi:** Grep semua pemanggil `getFinancialReports` dan pastikan argumen sudah sesuai.

---

### 1.2 Convert Float → Decimal(18,2) di Schema

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Effort** | 4 jam |
| **Status** | ✅ Selesai |

**Problem:**
Invoice, Payment, dan Expense menggunakan `Float` (IEEE 754), sedangkan JournalEntry menggunakan `Decimal(18,2)`. Saat auto-journal membuat jurnal dari invoice, terjadi **implicit precision loss**. Pada volume tinggi (ribuan transaksi/bulan), selisih akumulatif bisa menjadi material.

**File yang perlu diubah:**
- `prisma/schema.prisma` — Ubah semua field keuangan:
  ```
  Invoice:       subtotal, ppn, total → Decimal @db.Decimal(18,2)
  InvoiceItem:   harga, jumlah       → Decimal @db.Decimal(18,2)
  Payment:       jumlah              → Decimal @db.Decimal(18,2)
  Expense:       jumlah, pphAmount, netAmount → Decimal @db.Decimal(18,2)
  RecurringInvoice: feeAmount        → Decimal @db.Decimal(18,2)
  ```
- `src/app/actions/invoices.ts` — Update kalkulasi untuk handle Decimal
- `src/app/actions/expenses.ts` — Update kalkulasi
- `src/lib/auto-journal.ts` — Pastikan conversion Decimal → number hanya di return value
- `src/lib/data.ts` — Update TypeScript interfaces

**Migration:**
```bash
npx prisma migrate dev --name convert-float-to-decimal
```

**Verifikasi:** Buat invoice, bayar, cek jurnal — pastikan amount persis sama tanpa selisih sen.

---

### 1.3 Hapus JournalEntry & Payment dari Soft-Delete, Implement Reversing Entry

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Effort** | 8 jam |
| **Status** | ✅ Selesai |

**Problem:**
Jurnal dan pembayaran yang sudah posted bisa di-soft-delete, melanggar **prinsip immutability** data keuangan. Auditor eksternal akan menandai ini sebagai **material weakness in internal controls**.

**File yang perlu diubah:**
- `src/lib/prisma.ts` — Hapus `'JournalEntry'` dan `'Payment'` dari `SOFT_DELETE_MODELS`
- `src/lib/auto-journal.ts` — Pastikan `createInvoiceReversalJournal()` selalu digunakan
- `src/app/actions/accounting.ts` — `deleteJournalEntry()` harus membuat reversing entry, bukan soft-delete
- `src/app/actions/invoices.ts` — `deleteInvoice()` sudah partially benar (reversal untuk Terkirim), tapi perlu cleanup
- **Baru:** `src/app/actions/payments.ts` — Implement `reversePayment()` yang membuat jurnal pembalik

**Solusi:**
```typescript
// Alih-alih soft-delete:
await prisma.journalEntry.update({
    where: { id },
    data: { deletedAt: new Date() }  // ❌ JANGAN
});

// Gunakan reversing entry:
await createReversalJournal(tx, {
    originalJournalId: id,
    reason: "Pembatalan oleh user",
    date: originalJournal.date,  // Gunakan tanggal asli, bukan hari ini
});
await tx.journalEntry.update({
    where: { id },
    data: { status: "Reversed" }  // Mark sebagai reversed, jangan delete
});
```

**Schema change:** Tambah `Reversed` ke enum `JournalStatus`.

**Verifikasi:**
1. Delete invoice Terkirim → cek jurnal pembalik dibuat dengan tanggal yang benar
2. Reverse payment → cek jurnal pembalik dan status invoice kembali
3. Posted journal → tidak bisa di-delete, hanya bisa di-reverse

---

### 1.4 Update FixedAsset Book Value saat Depreciation

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Effort** | 2 jam |
| **Status** | ✅ Selesai |

**Problem:**
`runMonthlyDepreciation()` membuat jurnal penyusutan tapi **tidak mengupdate** `FixedAsset.accumDeprecCurrent` dan `FixedAsset.bookValue`. Tabel aset menampilkan data stale.

**File yang perlu diubah:**
- `src/app/actions/accounting/depreciation.ts` — Tambah update di dalam transaction:

```typescript
// Di dalam loop setelah kalkulasi monthly depreciation:
for (const asset of assets) {
    // ... kalkulasi monthly ...
    if (monthly > 0) {
        await tx.fixedAsset.update({
            where: { id: asset.id },
            data: {
                accumDeprecCurrent: { increment: monthly },
                bookValue: { decrement: monthly },
            },
        });
    }
}
```

**Verifikasi:** Jalankan penyusutan → cek tabel FixedAsset di Prisma Studio → `bookValue` harus berkurang.

---

## Phase 2: Data Integrity & Accounting Logic

### 2.1 Validasi Arah Debit/Credit per Tipe Akun

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 3 jam |
| **Status** | ⬜ Belum |

**Problem:**
Sistem hanya validasi total debit = total credit, tapi tidak validasi apakah arah sesuai tipe akun (Aset/Beban normal debit, Liabilitas/Ekuitas/Pendapatan normal credit). User bisa membuat jurnal yang secara teknis balanced tapi secara akuntansi salah.

**File yang perlu diubah:**
- `src/lib/accounting-helpers.ts` — Tambah fungsi `validateAccountDirections()`
- `src/app/actions/accounting.ts` — Panggil sebelum create journal (opsional: warning, bukan blocking)

**Solusi:**
```typescript
export function validateAccountDirections(
    items: { accountId: string; accountType: AccountType; debit: number; credit: number }[]
): { warnings: string[] } {
    const warnings: string[] = [];
    for (const item of items) {
        const isNormalDebit = ["Asset", "Expense"].includes(item.accountType);
        if (isNormalDebit && item.credit > 0 && item.debit === 0) {
            warnings.push(`Akun ${item.accountId} (${item.accountType}) biasanya di-debit, bukan di-credit`);
        }
        // Vice versa untuk Liability/Equity/Revenue
    }
    return { warnings };
}
```

**Note:** Ini sebaiknya **warning**, bukan blocking — karena ada kasus valid seperti pengembalian (return) yang membalik arah normal.

---

### 2.2 Tampilkan Zero-Balance Account di Neraca Lajur

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
Akun aktif dengan saldo nol tidak muncul di Neraca Lajur. Standar pelaporan mengharuskan semua akun aktif ditampilkan.

**File yang perlu diubah:**
- `src/app/actions/accounting/neraca-lajur.ts:66` — Hapus filter `&& balance !== 0`
- Tampilkan akun zero-balance dengan style muted/grey agar tetap readable

---

### 2.3 Gunakan Tax Config untuk Semua Referensi Akun Pajak

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
`neraca-lajur.ts:200` hardcode akun pajak `"321"`. Seharusnya menggunakan `PPH_RATES` dari `tax-config.ts` yang sudah ada.

**File yang perlu diubah:**
- `src/app/actions/accounting/neraca-lajur.ts` — Import dan loop semua kode akun pajak dari `PPH_RATES`
- Grep codebase untuk hardcoded `"321"`, `"322"`, `"323"` dan ganti dengan referensi ke config

---

### 2.4 Invoice Reversal Harus Menggunakan Tanggal Invoice Asli

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 1 jam |
| **Status** | ⬜ Belum |

**Problem:**
`createInvoiceReversalJournal()` menggunakan `date: new Date()`. Ini merusak period matching di laporan keuangan.

**File yang perlu diubah:**
- `src/lib/auto-journal.ts:265` — Ganti `new Date()` dengan tanggal invoice asli (`invoice.tanggal`)

```typescript
// BEFORE
date: new Date(),

// AFTER
date: invoice.tanggal,
```

---

### 2.5 Error Handling untuk PPh Type Invalid

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 1 jam |
| **Status** | ⬜ Belum |

**Problem:**
Jika `pphType` tidak ada di `PPH_RATES`, withholding diam-diam di-skip. User tidak tahu potongan pajak tidak terhitung.

**File yang perlu diubah:**
- `src/lib/auto-journal.ts` — Tambah validasi:
```typescript
if (data.pphType && !PPH_RATES[data.pphType]) {
    return { success: false, error: `Tipe PPh "${data.pphType}" tidak valid.` };
}
```
- `src/app/actions/expenses.ts` — Tambah validasi yang sama sebelum auto-journal

---

### 2.6 Depreciation Idempotency Check

| | |
|---|---|
| **Severity** | 🟠 High |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
`runMonthlyDepreciation()` bisa dijalankan berkali-kali untuk periode yang sama, menghasilkan jurnal duplikat.

**File yang perlu diubah:**
- `src/app/actions/accounting/depreciation.ts` — Tambah check:
```typescript
const existing = await tx.journalEntry.findFirst({
    where: {
        clientId: data.clientId,
        source: "auto_depreciation",
        description: { contains: data.period },
        status: "Posted",
        deletedAt: null,
    },
});
if (existing) {
    throw new Error(`Penyusutan untuk periode ${data.period} sudah pernah dijalankan (${existing.refNumber}).`);
}
```

---

## Phase 3: UX/UI Improvements

### 3.1 Standardize Client Selector — Global di Layout

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 6 jam |
| **Status** | ⬜ Belum |

**Problem:**
Setiap sub-page punya pola pemilihan klien berbeda:
- Journal: selector di modal
- Buku Besar: selector di atas page
- Reports: selector muncul 2 kali
- Aging: optional, default semua
- Accounts: otomatis dari server

**Solusi:**
Buat **global client selector** di accounting layout (`layout.tsx`) yang:
1. Admin/staff: dropdown di atas, persisten antar sub-page (simpan di URL search param atau context)
2. Client role: hidden, auto-scoped
3. Semua sub-page membaca dari context/URL, bukan manage sendiri

**File yang perlu diubah:**
- `src/app/dashboard/accounting/layout.tsx` — Tambah client selector + context provider
- **Baru:** `src/lib/hooks/useSelectedClient.tsx` — Hook/context untuk share selected client
- Semua sub-page — Migrasi dari local state ke shared context
- `src/app/dashboard/accounting/reports/ReportsView.tsx` — Hapus duplikat selector

---

### 3.2 Standardize Error Handling — Toast Everywhere

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 3 jam |
| **Status** | ⬜ Belum |

**Problem:**
Mix antara `alert()`, `toast`, dan diam-diam gagal.

| Halaman | Pattern Saat Ini |
|---------|------------------|
| Journal | `alert()` |
| Documents | `alert()` |
| Expenses (create) | `toast` ✅ |
| Aging | `toast` ✅ |
| Reports | Tidak ada error UI ❌ |
| Buku Besar | Tidak ada error UI ❌ |
| Neraca | Tidak ada error UI ❌ |

**File yang perlu diubah:**
- `src/app/dashboard/accounting/journal/JournalEntriesListView.tsx` — Ganti `alert()` → `toast`
- `src/app/dashboard/accounting/documents/page.tsx` — Ganti `alert()` → `toast`
- `src/app/dashboard/accounting/reports/ReportsView.tsx` — Tambah `toast.error()` saat API gagal
- `src/app/dashboard/accounting/buku-besar/page.tsx` atau `LedgerView.tsx` — Tambah error handling
- `src/app/dashboard/accounting/neraca/page.tsx` atau `NeracaView.tsx` — Tambah error handling

---

### 3.3 Reorganisasi Tab Order & Grouping

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
13 tab tanpa grouping. CoA (yang harus di-setup pertama) ada di posisi terakhir. Mobile user tidak tahu ada tab tersembunyi.

**Solusi — Opsi A: Reorder + Visual Divider:**
```
Setup:    [Chart of Accounts] | [Import]
Input:    [Jurnal Umum] | [Beban] | [Penyusutan]
Laporan:  [Buku Besar] | [Neraca Lajur] | [Neraca] | [Ekuitas] | [Laporan Keuangan] | [Arus Kas]
Operasi:  [Aging] | [Tutup Buku] | [Dokumen]
```

**Solusi — Opsi B: Dropdown Sub-menu:**
Untuk mobile, gabungkan laporan dalam satu dropdown "Laporan ▾" yang expandable.

**File yang perlu diubah:**
- `src/app/dashboard/accounting/layout.tsx` — Reorder tabs, tambah visual separator/grouping

---

### 3.4 Tambah Pagination di Documents & Expenses

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 4 jam |
| **Status** | ⬜ Belum |

**Problem:**
Documents dan Expenses load **semua data sekaligus**. Dengan 500+ record, halaman menjadi lambat.

**File yang perlu diubah:**
- `src/app/actions/expenses.ts` — Tambah parameter `page`, `pageSize` (max 50)
- `src/app/actions/accounting-documents.ts` — Tambah parameter `page`, `pageSize`
- `src/app/dashboard/accounting/expenses/ExpenseListView.tsx` — Tambah pagination controls
- `src/app/dashboard/accounting/documents/page.tsx` — Tambah pagination controls

**Pattern:** Ikuti pola yang sudah ada di `JournalEntriesListView.tsx` (URL search params + Prev/Next).

---

### 3.5 Tambah Drill-Down dari Laporan ke Jurnal

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 8 jam |
| **Status** | ⬜ Belum |

**Problem:**
Di Buku Besar, Neraca, dan Laporan Keuangan, user tidak bisa klik angka untuk melihat jurnal pembentuknya. Ini fitur **wajib** di software akuntansi profesional.

**Solusi:**
1. Setiap angka di Buku Besar yang memiliki `refNumber` → link ke `/dashboard/accounting/journal?ref={refNumber}`
2. Setiap baris di Neraca → klik untuk expand daftar jurnal yang membentuk saldo tersebut
3. Di Laporan Keuangan → klik total pendapatan → expand list jurnal pendapatan

**File yang perlu diubah:**
- `src/app/dashboard/accounting/buku-besar/` atau `LedgerView.tsx` — Tambah link ke jurnal
- `src/app/dashboard/accounting/neraca/` atau `NeracaView.tsx` — Tambah expandable rows
- `src/app/dashboard/accounting/reports/ReportsView.tsx` — Tambah expandable sections
- `src/app/dashboard/accounting/journal/page.tsx` — Support `?ref=` filter dari URL

---

### 3.6 Tambah Balance Sheet Equation Check di UI

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 1 jam |
| **Status** | ⬜ Belum |

**Problem:**
Neraca tidak menampilkan validasi `Aset = Liabilitas + Ekuitas`. Jika ada selisih karena bug, user tidak akan tahu.

**File yang perlu diubah:**
- `src/app/dashboard/accounting/neraca/` atau `NeracaView.tsx` — Tambah row terakhir:
```tsx
{diff !== 0 && (
    <div className="bg-error/10 border border-error rounded-lg p-3 text-error">
        ⚠️ Neraca tidak seimbang! Selisih: {formatIDR(Math.abs(diff))}
    </div>
)}
```

---

## Phase 4: Feature Completeness

### 4.1 Rekonsiliasi Bank

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 16 jam |
| **Status** | ⬜ Belum |

**Problem:**
Tidak ada modul untuk mencocokkan saldo buku (dari jurnal) dengan saldo bank (dari mutasi rekening). Ini proses **wajib bulanan** di firma konsultan.

**Scope:**
1. **Schema:** Tambah model `BankReconciliation` dan `BankReconciliationItem`
2. **Action:** CRUD rekonsiliasi + matching logic
3. **UI:** Halaman rekonsiliasi dengan side-by-side view (buku vs bank)
4. **Tab:** Tambah tab "Rekonsiliasi" di accounting layout

**Schema:**
```prisma
model BankReconciliation {
  id               String   @id @default(cuid())
  clientId         String
  accountId        String
  statementDate    DateTime
  statementBalance Decimal  @db.Decimal(18,2)
  bookBalance      Decimal  @db.Decimal(18,2)
  difference       Decimal  @db.Decimal(18,2)
  status           String   @default("DRAFT") // DRAFT, RECONCILED
  reconciledAt     DateTime?
  reconciledBy     String?
  createdAt        DateTime @default(now())

  client           Client   @relation(fields: [clientId], references: [id])
  account          Account  @relation(fields: [accountId], references: [id])
  items            BankReconciliationItem[]

  @@index([clientId, accountId])
  @@map("bank_reconciliations")
}

model BankReconciliationItem {
  id               String   @id @default(cuid())
  reconciliationId String
  journalItemId    String?
  description      String
  amount           Decimal  @db.Decimal(18,2)
  isMatched        Boolean  @default(false)

  reconciliation   BankReconciliation @relation(fields: [reconciliationId], references: [id])

  @@map("bank_reconciliation_items")
}
```

---

### 4.2 Multi-Period Comparison di Laporan Keuangan

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 12 jam |
| **Status** | ⬜ Belum |

**Problem:**
Laporan keuangan hanya menampilkan **satu periode**. Tidak bisa membandingkan tahun ini vs tahun lalu. Ini adalah **standar minimum** untuk laporan yang diserahkan ke manajemen klien.

**Scope:**
1. Tambah pilihan "Periode Pembanding" di ReportsView
2. Fetch 2 set data (current period + comparison period) secara parallel
3. Tampilkan side-by-side columns: Current | Previous | Perubahan (Rp) | Perubahan (%)
4. Berlaku untuk: Neraca, Laba Rugi, Arus Kas

**File yang perlu diubah:**
- `src/app/dashboard/accounting/reports/ReportsView.tsx` — Tambah comparison UI
- `src/app/actions/accounting.ts` — Function sudah support date range, tinggal panggil 2x
- `src/app/actions/accounting/cash-flow.ts` — Sama

---

### 4.3 Journal Approval Workflow

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 10 jam |
| **Status** | ⬜ Belum |

**Problem:**
Saat ini jurnal langsung `Posted` tanpa review. Di firma konsultan, workflow yang benar:
```
Draft → Pending Review → Approved/Posted → (Reversed jika perlu)
```

**Scope:**
1. Tambah status `PendingReview` ke enum `JournalStatus`
2. Jurnal baru default masuk `Draft` atau `PendingReview`
3. Hanya user dengan role tertentu (reviewer/admin senior) yang bisa approve ke `Posted`
4. UI: Badge status, tombol "Approve" & "Reject", filter by status

**File yang perlu diubah:**
- `prisma/schema.prisma` — Tambah `PendingReview` ke `JournalStatus`
- `src/app/actions/accounting.ts` — Tambah `approveJournalEntry()`, `rejectJournalEntry()`
- `src/app/dashboard/accounting/journal/JournalEntriesListView.tsx` — Tambah approval UI
- `src/lib/auth-helpers.ts` — Tambah role check untuk approval

---

### 4.4 AP Payment Workflow (Pembayaran Hutang Usaha)

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 6 jam |
| **Status** | ⬜ Belum |

**Problem:**
Expense unpaid (AP / Hutang Usaha) bisa dicatat, tapi tidak ada workflow untuk **membayar hutang** tersebut. Saat expense unpaid dibuat, jurnal: Dr Beban, Cr Hutang Usaha. Tapi tidak ada action untuk: Dr Hutang Usaha, Cr Bank (saat pembayaran dilakukan).

**Scope:**
1. Tambah `payExpense()` action
2. Auto-journal: Dr Hutang Usaha (300), Cr Bank (110)
3. Update expense status `isPaid = true`
4. UI: Tombol "Bayar" di tabel expense untuk item yang belum lunas

**File yang perlu diubah:**
- `src/app/actions/expenses.ts` — Tambah `payExpense()`
- `src/lib/auto-journal.ts` — Tambah `createAPPaymentJournal()`
- `src/app/dashboard/accounting/expenses/ExpenseListView.tsx` — Tambah tombol bayar + modal

---

### 4.5 Budget vs Actual

| | |
|---|---|
| **Severity** | 🟢 Low |
| **Effort** | 16 jam |
| **Status** | ⬜ Belum |

**Problem:**
Tidak ada modul budget. Perbandingan budget vs actual adalah deliverable standar firma konsultan ke klien.

**Scope:**
1. Model `Budget` dan `BudgetItem` (per account, per periode)
2. UI input budget tahunan/bulanan per akun
3. Laporan Budget vs Actual dengan variance analysis
4. Dashboard card showing over/under budget accounts

---

## Phase 5: Professional Polish

### 5.1 Audit Trail Lengkap untuk Semua Operasi Keuangan

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 8 jam |
| **Status** | ⬜ Belum |

**Problem:**
`writeAuditLog()` bersifat async, bisa gagal diam-diam, dan tidak dipanggil di semua operasi keuangan.

**Yang perlu di-audit-log:**
- [x] Invoice creation
- [x] Payment recording
- [ ] Journal entry creation/posting
- [ ] Journal reversal
- [ ] Account balance updates
- [ ] Expense creation/deletion
- [ ] Fiscal period closing
- [ ] Depreciation runs
- [ ] Account modifications

**Solusi:**
1. Buat `writeAuditLogInTx(tx, input)` yang berjalan **di dalam transaction** (bukan async terpisah)
2. Panggil di semua operasi keuangan di atas
3. Pastikan `AuditLog` **tidak ada** di `SOFT_DELETE_MODELS`

---

### 5.2 Recurring Invoice Idempotency

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 4 jam |
| **Status** | ⬜ Belum |

**Problem:**
Cron `/api/cron/generate-recurring` bisa menghasilkan invoice duplikat jika di-trigger 2x dalam window yang sama.

**File yang perlu diubah:**
- `src/app/api/cron/generate-recurring/route.ts` — Tambah idempotency check:
```typescript
// Check: sudah ada invoice dari recurring ini untuk periode ini?
const existing = await prisma.invoice.findFirst({
    where: {
        recurringInvoiceId: recurring.id,
        tanggal: { gte: periodStart, lte: periodEnd },
        deletedAt: null,
    },
});
if (existing) continue; // Skip, sudah di-generate
```

---

### 5.3 Account Code Uniqueness untuk Shared Accounts

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
`@@unique([code, clientId])` — PostgreSQL memperlakukan `NULL` sebagai distinct. Dua shared account (clientId = null) dengan kode sama bisa lolos constraint.

**Solusi — Opsi A:** Tambah partial unique index via migration:
```sql
CREATE UNIQUE INDEX account_code_shared_unique
ON accounts (code) WHERE "clientId" IS NULL;
```

**Solusi — Opsi B:** Validasi di application layer (`seed-accounts.ts`, `createAccount()`) — check existing sebelum insert.

---

### 5.4 Database-Level Accounting Constraints

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Effort** | 2 jam |
| **Status** | ⬜ Belum |

**Problem:**
Validasi debit/credit hanya di TypeScript. Bisa di-bypass via raw SQL atau race condition.

**Solusi:** Tambah constraints via migration:
```sql
-- Tidak boleh debit DAN credit > 0 pada satu baris
ALTER TABLE journal_items ADD CONSTRAINT check_debit_credit
    CHECK (NOT (debit > 0 AND credit > 0));

-- Debit dan credit harus >= 0
ALTER TABLE journal_items ADD CONSTRAINT check_non_negative
    CHECK (debit >= 0 AND credit >= 0);

-- Invoice total harus > 0
ALTER TABLE invoices ADD CONSTRAINT check_positive_total
    CHECK (total > 0);
```

---

## Hal yang Sudah Bagus

Penting untuk didokumentasikan apa yang **tidak perlu diubah** — agar tidak ada regresi:

| Aspek | Detail | Status |
|-------|--------|--------|
| **Double-entry enforcement** | `validateJournalBalance()` dengan toleransi 0.001 | ✅ Solid |
| **Serializable transactions** | Semua operasi kritis pakai isolation level yang benar | ✅ Solid |
| **Atomic counter generation** | `INSERT...ON CONFLICT DO UPDATE RETURNING` | ✅ Best practice |
| **Multi-tenancy isolation** | `assertCanAccessClient()` di semua action | ✅ Solid |
| **Closed period protection** | Journal ditolak jika periode sudah ditutup | ✅ Solid |
| **Auto-journal engine** | Invoice/Payment/Expense → jurnal otomatis | ✅ Solid |
| **PPh withholding** | PPh 21/23/4(2) dengan rate konfigurabel | ✅ Solid |
| **Account Balance cache** | Atomic upsert, efisien untuk real-time reports | ✅ Solid |
| **Cash Flow direct method** | Klasifikasi via contra-account | ✅ Valid approach |
| **CoA template system** | 6 template industri untuk onboarding cepat | ✅ Solid |
| **Indonesian localization** | formatIDR, tanggal ID, label Bahasa Indonesia | ✅ Solid |
| **UI design system** | Tailwind + Card/Badge/Toast pattern konsisten | ✅ Clean |

---

## Catatan Arsitektur

### Prinsip yang Harus Dijaga

1. **Server Actions as Data Layer** — Semua akses DB melalui `"use server"` functions. Jangan bypass.
2. **Serializable for Finance** — Semua operasi keuangan harus `TransactionIsolationLevel.Serializable`.
3. **Atomic Counters** — Ref number generation via `INSERT...ON CONFLICT`. Jangan pakai `findMany` + `count`.
4. **Immutable Financial Records** — Setelah Phase 1.3 selesai, jurnal posted tidak boleh di-delete/update.
5. **Account Balance Cache** — `updateAccountBalances()` harus selalu dipanggil di dalam transaction yang sama dengan journal creation.

### Saran Arsitektur Jangka Panjang

- **Event Sourcing untuk Accounting** — Semua perubahan saldo adalah event yang bisa di-replay. Cocok untuk audit trail.
- **Queue System** — BullMQ/Redis untuk OCR processing dan batch import (saat ini synchronous).
- **Row-Level Security (RLS)** — PostgreSQL RLS sebagai defense-in-depth untuk multi-tenancy.
- **Materialized Views** — Ganti client-side calculation di laporan dengan PostgreSQL materialized views.

---

> **Note:** Dokumen ini adalah living document. Update status setiap item setelah implementasi selesai. Hapus item yang sudah tidak relevan.
