import { JenisWP, TaxDeadlineStatus } from "@prisma/client";

// ── Indonesian month names ───────────────────────────────────────────────────

const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ── Deadline Templates ───────────────────────────────────────────────────────

interface DeadlineTemplate {
    jenisPajak: string;
    deskripsi: string;
    /** Returns the deadline date for a given tax period (year, month 0-based). */
    getTanggalBatas: (year: number, month: number) => Date;
    isMonthly: boolean;
}

// Badan (PT/CV) — monthly obligations
const BADAN_MONTHLY: DeadlineTemplate[] = [
    {
        jenisPajak: "PPh 21",
        deskripsi: "Setor & Lapor PPh 21 (pemotongan gaji karyawan)",
        getTanggalBatas: (y, m) => new Date(y, m + 1, 10), // 10th of next month
        isMonthly: true,
    },
    {
        jenisPajak: "PPh 23",
        deskripsi: "Setor & Lapor PPh 23 (pemotongan jasa/sewa/dividen)",
        getTanggalBatas: (y, m) => new Date(y, m + 1, 10),
        isMonthly: true,
    },
    {
        jenisPajak: "PPh 25",
        deskripsi: "Angsuran PPh 25 bulanan",
        getTanggalBatas: (y, m) => new Date(y, m + 1, 15), // 15th of next month
        isMonthly: true,
    },
    {
        jenisPajak: "PPN",
        deskripsi: "Pelaporan SPT Masa PPN",
        getTanggalBatas: (y, m) => new Date(y, m + 2, 0), // Last day of month+1
        isMonthly: true,
    },
];

// Badan — annual obligations
const BADAN_ANNUAL: DeadlineTemplate[] = [
    {
        jenisPajak: "SPT Tahunan Badan",
        deskripsi: "Lapor SPT Tahunan PPh Badan",
        getTanggalBatas: (y, _m) => new Date(y + 1, 3, 30), // April 30 next year
        isMonthly: false,
    },
];

// Orang Pribadi — monthly obligations
const OP_MONTHLY: DeadlineTemplate[] = [
    {
        jenisPajak: "PPh 25",
        deskripsi: "Angsuran PPh 25 bulanan",
        getTanggalBatas: (y, m) => new Date(y, m + 1, 15),
        isMonthly: true,
    },
];

// Orang Pribadi — annual obligations
const OP_ANNUAL: DeadlineTemplate[] = [
    {
        jenisPajak: "SPT Tahunan OP",
        deskripsi: "Lapor SPT Tahunan PPh Orang Pribadi",
        getTanggalBatas: (y, _m) => new Date(y + 1, 2, 31), // March 31 next year
        isMonthly: false,
    },
];

// ── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate tax deadline records for a client, covering 12 months from startDate.
 * Returns plain objects ready for `prisma.taxDeadline.createMany()`.
 */
export function generateDeadlinesForClient(
    clientId: string,
    jenisWP: JenisWP,
    startDate: Date = new Date()
): Array<{
    jenisPajak: string;
    deskripsi: string;
    tanggalBatas: Date;
    masaPajak: string;
    status: TaxDeadlineStatus;
    clientId: string;
}> {
    const monthlyTemplates = jenisWP === JenisWP.Badan ? BADAN_MONTHLY : OP_MONTHLY;
    const annualTemplates = jenisWP === JenisWP.Badan ? BADAN_ANNUAL : OP_ANNUAL;

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-based

    const deadlines: Array<{
        jenisPajak: string;
        deskripsi: string;
        tanggalBatas: Date;
        masaPajak: string;
        status: TaxDeadlineStatus;
        clientId: string;
    }> = [];

    // Monthly deadlines — 12 months starting from current month
    for (let i = 0; i < 12; i++) {
        const month = (startMonth + i) % 12;
        const year = startYear + Math.floor((startMonth + i) / 12);

        for (const template of monthlyTemplates) {
            deadlines.push({
                jenisPajak: template.jenisPajak,
                deskripsi: `${template.deskripsi} - ${BULAN[month]} ${year}`,
                tanggalBatas: template.getTanggalBatas(year, month),
                masaPajak: `${BULAN[month]} ${year}`,
                status: TaxDeadlineStatus.BelumLapor,
                clientId,
            });
        }
    }

    // Annual deadlines — for current fiscal year
    for (const template of annualTemplates) {
        deadlines.push({
            jenisPajak: template.jenisPajak,
            deskripsi: `${template.deskripsi} ${startYear}`,
            tanggalBatas: template.getTanggalBatas(startYear, 0),
            masaPajak: `${startYear}`,
            status: TaxDeadlineStatus.BelumLapor,
            clientId,
        });
    }

    return deadlines;
}
