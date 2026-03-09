---
description: NIB Application Workflow
---
# NIB Application Workflow (Integrated)

Follow these steps to process a NIB (Nomor Induk Berusaha) application using National APIs:

1. **Pemohon login ke sistem**
2. **Pilih: "Ajukan NIB"**
3. **Isi profil usaha**: nama, NIK, NPWP, KBLI, alamat.
4. **[SISTEM] Verifikasi Identitas → Dukcapil API (POST /verify/nik)**
    - NIK valid & sesuai (Nama, Tgl Lahir) → lanjut.
    - NIK tidak valid → tampilkan error.
5. **[SISTEM] Validasi NPWP → DJP API (POST /verify/npwp)**
    - NPWP aktif & sesuai → lanjut.
    - NPWP tidak valid/tidak aktif → tampilkan error.
6. **[SISTEM] Analisis KBLI & Risiko → OSS API (GET /kbli/{kode})**
    - Risiko: **RENDAH** → Jalur Otomatis.
    - Risiko: **MENENGAH/TINGGI** → Jalur Verifikasi (Manual).
7. **[SISTEM] Pembayaran Retribusi (jika ada) → Payment Gateway (Midtrans/Xendit)**
    - Buat tagihan (POST /payment/create).
    - Tunggu Webhook konfirmasi pembayaran.
8. **[SISTEM] Submit ke OSS → OSS API (POST /nib/sync)**.
9. **[SISTEM] Digital Signing → BSrE BSSN API (POST /sign/document)**
    - Menggunakan TTE tersertifikasi (Standard PAdES).
10. **Status: ISSUED**
11. **Notifikasi ke pemohon**: Email + WhatsApp (Simulasi).
12. **Pemohon download NIB** (PAdES PDF with QR Code).

**SLA**: Real-time / < 1 jam (untuk Risiko Rendah).
