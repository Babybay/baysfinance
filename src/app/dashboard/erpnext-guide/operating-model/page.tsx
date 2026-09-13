import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isAdminOrStaffRole } from "@/lib/user-roles";

const sections = [
    {
        id: "model", title: "1. Klien CRM bukan Company pembukuan",
        intro: "ERPNext adalah platform kerja utama staf CAL; website CAL adalah portal klien dan pintu masuk layanan. Satu CRM dapat melayani banyak klien tanpa membuat Company untuk setiap prospek.",
        steps: [
            "Lead menyimpan prospek. Setelah kualifikasi dan persetujuan engagement, Customer mewakili pihak yang membeli jasa CAL; Contact dan Address menyimpan PIC serta alamat. Cari nama legal dan identitas yang sah sebelum membuat data baru.",
            "Project mewakili engagement, misalnya jasa pajak bulanan, dengan Task, pemilik, tenggat, dan bukti kerja. Customer atau Project baru tidak otomatis membutuhkan Company baru.",
            "Company mewakili entitas yang bukunya dikelola terpisah. Buat hanya jika CAL benar-benar mengelola ledger badan usaha tersebut dan mandat, identitas legal, periode pembukuan, serta reviewer telah disetujui.",
            "Contoh: PT Contoh Bengkel adalah Customer pembeli jasa CAL. Jika pembukuannya dikelola, PT Contoh Bengkel juga dapat memiliki Company tersendiri. Hubungan Customer–Company harus dicatat secara eksplisit; kesamaan nama bukan pemetaan otomatis.",
            "Invoice jasa CAL ke klien masuk buku entitas CAL yang menagih. Penjualan bengkel ke pemilik kendaraan atau penjualan restoran ke tamu masuk buku Company klien, bukan pendapatan CAL. Cabang satu badan hukum biasanya menggunakan Warehouse/Cost Center sesuai desain akuntansi, bukan Company baru secara otomatis.",
        ],
    },
    {
        id: "intake", title: "2. Checklist onboarding klien CRM",
        intro: "PIC onboarding memimpin intake; engagement owner menerima pekerjaan; reviewer menyetujui data dan ruang lingkup sebelum operasional dimulai.",
        steps: [
            "Cari Lead/Customer yang sudah ada. Verifikasi nama legal, identitas pajak sesuai kebutuhan, PIC, sektor, layanan, periode, persetujuan pemrosesan data, dan dokumen engagement melalui kanal aman. Jangan salin identitas sensitif ke catatan pengetahuan ini.",
            "Pendaftaran website adalah intake prospek, bukan persetujuan klien, pembuatan Company, atau pemberian akun Desk. Konfirmasi Lead hasil integrasi; bila gagal, eskalasi dan periksa status sebelum mengulang agar tidak membuat duplikat.",
            "Kualifikasi Lead dan buat/tentukan Customer setelah engagement disetujui. Hubungkan Contact/Address, tetapkan engagement owner dan reviewer, lalu buat Project serta Task dengan tanggal mulai, tenggat, dan checklist dokumen.",
            "Catat pemetaan ID klien CAL, Lead/Customer ERPNext, Project, dan Company jika pembukuan termasuk layanan. Jangan mengasumsikan semua relasi atau dokumen tersinkron otomatis.",
            "Admin menyiapkan akses portal klien sesuai identitas dan lingkup klien. Uji dengan akun klien representatif bahwa hanya data kliennya terlihat; akun portal tidak boleh otomatis memperoleh akses Desk.",
            "Serahkan pekerjaan dengan owner, next action, tenggat, dokumen yang kurang, dan keputusan sistem sumber. Onboarding selesai setelah reviewer menerima checklist dan akses telah diuji.",
        ],
    },
    {
        id: "ledger", title: "3. Checklist Company dan batas akses",
        intro: "Multi-company memisahkan ledger melalui Company, tetapi bukan isolasi tenant yang keras. Customer, Supplier, Item, Contact, dan master lain dapat dipakai bersama dalam satu site.",
        steps: [
            "Admin dan penanggung jawab akuntansi memverifikasi entitas legal, singkatan unik, mata uang, tahun fiskal, Chart of Accounts, akun default, kebijakan pajak, bank, Cost Center, serta Warehouse jika ada persediaan. Jangan menyalin saldo atau akun bank CAL ke klien.",
            "Petakan master bersama dengan hati-hati: nama dan kode harus jelas, akun/default per Company harus diperiksa. Pembatasan pada Company tidak otomatis menyembunyikan seluruh master, laporan, file, atau data kustom.",
            "Terapkan Role Permissions dan User Permissions berdasarkan penugasan, bukan hanya memilih default Company. Workspace yang tersembunyi bukan kontrol keamanan. Hindari akses semua Company untuk staf yang hanya menangani klien tertentu.",
            "Uji akses positif dan negatif dengan akun staf representatif: daftar, URL dokumen langsung, pencarian, laporan, ekspor, lampiran, dan API. Pastikan klien A tidak dapat dibaca atau diubah oleh staf yang hanya ditugaskan ke klien B. Jika kerahasiaan memerlukan isolasi keras, evaluasi site terpisah sebelum onboarding.",
            "Impor saldo awal, piutang/utang, dan stok hanya dari data yang direkonsiliasi dan disetujui. Latih transaksi Draft di lingkungan uji; verifikasi Company, akun, gudang, tanggal, pajak, pihak, dan total sebelum Submit oleh petugas berwenang.",
            "Lakukan rekonsiliasi bank, piutang, utang, stok, dan neraca saldo sebelum serah terima. Jangan memposting transaksi lintas badan usaha sebagai satu jurnal; transaksi antarperusahaan memerlukan dokumen dan review masing-masing buku.",
        ],
    },
    {
        id: "bengkel", title: "4. Alur sektor bengkel",
        intro: "Contoh SOP yang harus disesuaikan dan diuji; halaman ini tidak memasang modul bengkel atau mengaktifkan transaksi otomatis.",
        steps: [
            "Intake servis: catat pelanggan bengkel, kendaraan dan keluhan seperlunya, hasil inspeksi, estimasi jasa/suku cadang, serta persetujuan pelanggan. Batasi akses nomor kendaraan dan data pelanggan.",
            "Buat estimasi/Quotation lalu pesanan bila alurnya memakai Sales Order. Pantau pekerjaan teknisi melalui Project/Task atau dokumen servis yang telah disepakati. Jangan menganggap Job Card manufaktur sebagai work order servis kendaraan tanpa evaluasi.",
            "Pisahkan Item jasa dan Item stok suku cadang. Tetapkan Warehouse milik Company bengkel; catat pembelian melalui Purchase Order, Purchase Receipt, dan Purchase Invoice sesuai proses yang dipilih.",
            "Catat konsumsi/penyerahan suku cadang lewat alur stok yang disetujui. Jangan keluarkan stok dua kali melalui Stock Entry dan invoice dengan Update Stock untuk barang yang sama. Reviewer memeriksa kuantitas, biaya, retur, dan sisa stok.",
            "Setelah servis diterima pelanggan, buat Sales Invoice pada Company bengkel, catat Payment Entry dan bukti pembayaran. Rekonsiliasi kas/bank, piutang, stok, serta margin jasa dan suku cadang. Tagihan jasa konsultasi CAL tetap terpisah.",
        ],
    },
    {
        id: "restoran", title: "5. Alur sektor restoran",
        intro: "Pilih satu sumber transaksi penjualan: POS ERPNext atau POS eksternal dengan integrasi yang diverifikasi. Jangan mengimpor penjualan yang sudah dibukukan lagi secara manual.",
        steps: [
            "Siapkan Company restoran, outlet/Cost Center, Warehouse, akun kas/bank, metode pembayaran, dan Item menu/bahan. Validasi pajak layanan restoran dengan penanggung jawab pajak; jangan menyalin template pajak CAL begitu saja.",
            "Terima pembelian bahan dengan kuantitas, unit konversi, harga, dan bukti penerimaan yang diperiksa; proses Purchase Receipt/Purchase Invoice sesuai SOP. Catat penyimpanan, transfer, dan hasil stok opname.",
            "Tentukan metode konsumsi bahan: resep/BOM dan proses produksi yang dikonfigurasi, atau pencatatan konsumsi yang disetujui. Penjualan menu tidak otomatis mengurangi bahan resep tanpa konfigurasi. Pisahkan waste, spoilage, dan konsumsi internal dengan alasan serta persetujuan.",
            "Jalankan penjualan dan retur melalui POS/alur invoice yang ditetapkan. Jika POS eksternal digunakan, petakan nomor transaksi unik, Company, outlet, pajak, metode pembayaran, dan periode sebelum impor; uji duplikasi serta rekonsiliasi terlebih dahulu.",
            "Tutup shift dan cocokkan penjualan, diskon, void, kas fisik, kartu, QRIS, serta settlement platform delivery. Catat biaya/komisi dan selisih sesuai bukti; review HPP, stok, dan laba-rugi per outlet. Jangan mencampur kas restoran dengan rekening CAL.",
        ],
    },
    {
        id: "auth", title: "6. Login, kepemilikan data, dan eskalasi",
        intro: "Autentikasi saat ini terpisah: website CAL memakai NextAuth dengan akun lokal dan sesi JWT; ERPNext memakai akun serta sesi Frappe. Tautan ke Portal Staf hanya navigasi, bukan SSO.",
        steps: [
            "Login CAL tidak otomatis login Frappe; email yang sama tidak menyatukan akun, role, atau sesi. Logout dan perubahan akses harus ditangani pada masing-masing sistem. Jangan membagikan password, API key, atau tautan sesi. SSO tidak diimplementasikan oleh panduan ini.",
            "ERPNext menjadi tempat utama kerja staf: CRM, Project/Task, akuntansi dan review internal. CAL tetap portal klien. Untuk data portal, kalender pajak, perizinan, dokumen, invoice dan pembayaran yang masih dimiliki CAL, ikuti panduan sumber data yang berlaku sampai migrasi resmi disetujui.",
            "Sebelum membuat invoice atau pembayaran, konfirmasi sistem pemilik dan apakah integrasi aktif untuk jenis dokumen itu. Jangan menafsirkan SOP target di halaman ini sebagai bukti semua modul, permission, sinkronisasi, atau Company telah dikonfigurasi.",
            "Jika data berbeda, hentikan posting ganda. Laporkan ID dokumen, Company, waktu, status, dan pesan error yang sudah disamarkan kepada operations lead; jangan kirim kredensial atau lampiran sensitif lewat kanal umum. Koreksi hanya di sistem pemilik dengan reviewer dan jejak audit.",
        ],
    },
];

export default async function OperatingModelPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");
    if (!isAdminOrStaffRole(user.role)) redirect("/dashboard");

    return (
        <article lang="id" className="mx-auto max-w-4xl space-y-6 pb-10 text-foreground">
            <header className="rounded-[20px] border border-border bg-card p-6 lg:p-8">
                <Link href="/dashboard/erpnext-guide" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Kembali ke panduan staf ERPNext</Link>
                <p className="mt-4 text-sm font-semibold">Pengetahuan internal · Staff &amp; Admin</p>
                <h1 className="mt-2 font-serif text-3xl">Model operasional CAL multi-klien</h1>
                <p className="mt-3 leading-7">Panduan onboarding CRM, pembukuan badan usaha terpisah, serta alur bengkel dan restoran. Ini adalah SOP acuan, bukan bukti konfigurasi live atau otorisasi untuk melakukan posting.</p>
            </header>
            <nav aria-label="Daftar isi" className="rounded-[16px] border border-border bg-card p-6">
                <h2 className="font-serif text-xl">Daftar isi</h2>
                <ul className="mt-3 space-y-1">
                    {sections.map(({ id, title }) => <li key={id}><a href={`#${id}`} className="inline-flex min-h-11 items-center py-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{title}</a></li>)}
                </ul>
            </nav>
            {sections.map(({ id, title, intro, steps }) => (
                <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-[16px] border border-border bg-card p-6 lg:p-8">
                    <h2 id={`${id}-title`} className="font-serif text-2xl">{title}</h2>
                    <p className="mt-3 leading-7">{intro}</p>
                    <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
                        {steps.map((step) => <li key={step} className="pl-1">{step}</li>)}
                    </ol>
                </section>
            ))}
        </article>
    );
}
