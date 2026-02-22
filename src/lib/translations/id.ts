import type { Translations } from "./en";

export const id: Translations = {
    // Metadata
    meta: {
        title: "PajakConsult — Platform Konsultan Pajak",
        description: "Platform all-in-one untuk konsultan pajak: kelola klien, hitung pajak, pantau deadline, buat invoice, dan kelola dokumen.",
    },

    // Navbar
    nav: {
        features: "Fitur",
        pricing: "Harga",
        signIn: "Masuk",
        signUp: "Daftar",
        dashboard: "Dashboard",
    },

    // Hero
    hero: {
        badge: "Platform Konsultan Pajak #1 di Indonesia",
        heading: "Kelola Pajak Klien Lebih Mudah & Cepat.",
        description: "Platform all-in-one untuk konsultan pajak: kelola klien, hitung pajak, pantau deadline, buat invoice, dan kelola dokumen.",
        cta: "Mulai Gratis",
        ctaSecondary: "Lihat Fitur",
    },

    // Features
    features: {
        heading: "Semua yang Anda Butuhkan",
        description: "Infrastruktur lengkap untuk mengelola praktik konsultasi pajak Anda dengan standar enterprise.",
        clientManagement: {
            title: "Manajemen Klien",
            description: "Kelola data klien lengkap dengan NPWP, jenis WP, dan status perusahaan dalam satu dashboard terpusat.",
        },
        taxCalendar: {
            title: "Kalender Pajak",
            description: "Pantau otomatis deadline SPT Tahunan, PPN Masa, PPh 21/23/25 dengan indikator status real-time.",
        },
        taxCalculator: {
            title: "Kalkulator Pajak",
            description: "Hitung PPh 21 progresif, PPh 23, PPN 11%, dan PPh Final UMKM sesuai regulasi perpajakan terbaru.",
        },
        documentManagement: {
            title: "Manajemen Dokumen",
            description: "Arsipkan Faktur Pajak, Bukti Potong, SPT, dan Laporan Keuangan secara terstruktur per klien.",
        },
        invoiceBilling: {
            title: "Invoice & Billing",
            description: "Buat dan terbitkan invoice konsultasi dengan perhitungan otomatis PPN dan pelacakan status pelunasan.",
        },
        complianceReports: {
            title: "Laporan Kepatuhan",
            description: "Dashboard analitik detail untuk laporan pendapatan firma dan audit kepatuhan klien.",
        },
    },

    // CTA
    cta: {
        heading: "Mulai Efisiensi Praktik Anda",
        description: "Akselerasi alur kerja konsultasi pajak Anda hari ini dengan standar keamanan dan akurasi tinggi.",
        button: "Buat Akun Sekarang",
        free: "Gratis 14 hari",
        noCard: "Tanpa kartu kredit",
    },

    // Footer
    footer: {
        description: "Infrastruktur kelas enterprise untuk efisiensi maksimal bagi konsultan pajak di seluruh Indonesia.",
        platform: "Platform",
        company: "Perusahaan",
        privacy: "Kebijakan Privasi",
        terms: "Syarat & Ketentuan",
        contact: "Kontak",
        copyright: "Hak Cipta Dilindungi.",
    },

    // Dashboard
    dashboard: {
        title: "Dashboard",
        welcome: "Selamat datang kembali! Berikut ringkasan platform Anda.",
        revenue: "Pendapatan",
        invoicePaid: "Invoice lunas",
        activeClients: "Klien Aktif",
        fromClients: "dari {count} klien",
        outstanding: "Outstanding",
        unpaid: "Belum dibayar",
        upcomingDeadlines: "Deadline Mendatang",
        overdue: "{count} terlambat",
        nearestDeadlines: "Deadline Pajak Terdekat",
        viewAll: "Lihat Semua",
        allDeadlinesMet: "Semua deadline sudah terpenuhi! 🎉",
        unpaidInvoices: "Invoice Belum Lunas",
        allInvoicesPaid: "Semua invoice sudah lunas! 🎉",
    },

    // Dashboard Sidebar
    sidebar: {
        dashboard: "Dashboard",
        clients: "Klien",
        taxCalendar: "Kalender Pajak",
        taxCalculator: "Kalkulator Pajak",
        documents: "Dokumen",
        invoices: "Invoice",
        reports: "Laporan",
        userManagement: "Manajemen User",
        myAccount: "Akun Saya",
        backToHome: "Kembali ke Beranda",
    },
    userManagement: {
        title: "Manajemen User",
        subtitle: "Kelola role dan akses user ke platform",
        table: {
            name: "Nama",
            email: "Email",
            role: "Role",
            client: "Klien Terkait",
            actions: "Aksi",
        },
        roles: {
            admin: "Advisor (Admin)",
            client: "Klien (Wajib Pajak)",
        },
        assignClient: {
            label: "Pilih Klien",
            placeholder: "Pilih klien untuk user ini",
            none: "Tanpa Klien / Admin",
        },
        saveChanges: "Simpan Perubahan",
        cancel: "Batal",
        updateSuccess: "Metadata user berhasil diperbarui!",
        updateError: "Gagal memperbarui metadata user.",
    },

    // Not Found
    notFound: {
        heading: "404 — Tidak Ditemukan",
        description: "Halaman yang Anda cari tidak tersedia",
        backHome: "Kembali ke Beranda",
    },

    // Language
    lang: {
        en: "English",
        id: "Bahasa Indonesia",
    },
};
