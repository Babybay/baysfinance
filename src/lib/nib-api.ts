/**
 * Mock implementation of Indonesian National APIs for testing/demo purposes.
 * In production, these would use fetch() with real credentials.
 */

export const dukcapilApi = {
    verifyNIK: async (nik: string, name: string) => {
        console.log(`[Dukcapil API] Verifying NIK: ${nik} for ${name}`);
        await new Promise(r => setTimeout(r, 1000));
        // Mock logic: NIK starting with '0' is invalid
        if (nik.startsWith("0")) return { success: false, message: "NIK tidak terdaftar" };
        return { success: true, valid: true };
    }
};

export const djpApi = {
    verifyNPWP: async (npwp: string) => {
        console.log(`[DJP API] Verifying NPWP: ${npwp}`);
        await new Promise(r => setTimeout(r, 1000));
        if (npwp.length < 15) return { success: false, message: "Format NPWP salah" };
        return { success: true, active: true };
    },
    getTaxStatus: async (npwp: string) => {
        return { success: true, compliance: "Patuh" };
    }
};

export const ossApi = {
    getKBLI: async (code: string) => {
        console.log(`[OSS API] Fetching KBLI: ${code}`);
        await new Promise(r => setTimeout(r, 800));

        // Mock risk mapping
        const riskMap: Record<string, string> = {
            "47111": "RENDAH",
            "56101": "MENENGAH RENDAH",
            "62019": "RENDAH",
            "41011": "TINGGI"
        };

        return {
            success: true,
            code,
            name: "Perdagangan Eceran",
            risk: riskMap[code] || "MENENGAH TINGGI"
        };
    },
    syncNIB: async (payload: any) => {
        console.log(`[OSS API] Syncing NIB data...`);
        await new Promise(r => setTimeout(r, 2000));
        return { success: true, nib: "0903260012345" };
    }
};

export const paymentApi = {
    createCharge: async (amount: number) => {
        console.log(`[Payment API] Creating charge for IDR ${amount}`);
        return { success: true, invoiceUrl: "https://midtrans.com/pay/123", id: "pay_abc" };
    }
};

export const bsreApi = {
    signDocument: async (docName: string) => {
        console.log(`[BSrE API] Digitally signing ${docName}...`);
        await new Promise(r => setTimeout(r, 1500));
        return { success: true, signedUrl: `/docs/signed_${docName}` };
    }
};
