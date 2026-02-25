export const en = {
    // Metadata
    meta: {
        title: "PajakConsult — Tax Consulting Platform",
        description: "All-in-one platform for tax consultants: manage clients, calculate taxes, track deadlines, create invoices, and manage documents.",
    },

    // Navbar
    nav: {
        features: "Features",
        pricing: "Pricing",
        signIn: "Sign In",
        signUp: "Sign Up",
        dashboard: "Dashboard",
    },

    // Hero
    hero: {
        badge: "#1 Tax Consulting Platform in Indonesia",
        heading: "Manage Client Taxes Easier & Faster.",
        description: "All-in-one platform for tax consultants: manage clients, calculate taxes, track deadlines, create invoices, and manage documents.",
        cta: "Start Free",
        ctaSecondary: "See Features",
    },

    // Features
    features: {
        heading: "Everything You Need",
        description: "Complete infrastructure to manage your tax consulting practice with enterprise standards.",
        clientManagement: {
            title: "Client Management",
            description: "Manage complete client data with TIN, taxpayer type, and company status in one centralized dashboard.",
        },
        taxCalendar: {
            title: "Tax Calendar",
            description: "Automatically track Annual Tax Return, Monthly VAT, Income Tax 21/23/25 deadlines with real-time status indicators.",
        },
        taxCalculator: {
            title: "Tax Calculator",
            description: "Calculate progressive Income Tax 21, Income Tax 23, VAT 11%, and MSME Final Tax according to the latest tax regulations.",
        },
        documentManagement: {
            title: "Document Management",
            description: "Archive Tax Invoices, Withholding Slips, Tax Returns, and Financial Statements in a structured manner per client.",
        },
        invoiceBilling: {
            title: "Invoice & Billing",
            description: "Create and issue consulting invoices with automatic VAT calculation and payment status tracking.",
        },
        complianceReports: {
            title: "Compliance Reports",
            description: "Detailed analytics dashboard for firm revenue reports and client compliance audits.",
        },
    },

    // CTA
    cta: {
        heading: "Start Streamlining Your Practice",
        description: "Accelerate your tax consulting workflow today with high security and accuracy standards.",
        button: "Create Account Now",
        free: "Free 14 days",
        noCard: "No credit card required",
    },

    // Footer
    footer: {
        description: "Enterprise-grade infrastructure for maximum efficiency for tax consultants across Indonesia.",
        platform: "Platform",
        company: "Company",
        privacy: "Privacy Policy",
        terms: "Terms & Conditions",
        contact: "Contact",
        copyright: "All Rights Reserved.",
    },

    // Dashboard
    dashboard: {
        title: "Dashboard",
        welcome: "Welcome back! Here's your platform summary.",
        revenue: "Revenue",
        invoicePaid: "Invoices paid",
        activeClients: "Active Clients",
        fromClients: "from {count} clients",
        outstanding: "Outstanding",
        unpaid: "Unpaid",
        upcomingDeadlines: "Upcoming Deadlines",
        overdue: "{count} overdue",
        nearestDeadlines: "Nearest Tax Deadlines",
        viewAll: "View All",
        allDeadlinesMet: "All deadlines met! 🎉",
        unpaidInvoices: "Unpaid Invoices",
        allInvoicesPaid: "All invoices paid! 🎉",
    },

    // Services
    services: {
        heading: "Our Services",
        subtitle: "Services we offer to help your business",
        perijinanUsaha: "Business Permits",
        perijinanBangunan: "Building Permits",
        kitasKitap: "KITAS / KITAP",
        perijinanMikol: "Liquor Permits",
        akuntansi: "Accounting Services",
        perpajakan: "Tax Services",
        pendirianPerusahaan: "Company Establishment",
        legalitas: "Legality & Business Permits",
        izinTinggal: "Residence Permit Management (KITAS & VISA)",
        audit: "Internal & External Audit",
        appraisal: "Appraisal Services",
        financialAdvisory: "Financial Advisory",
    },

    // Dashboard Sidebar
    sidebar: {
        dashboard: "Dashboard",
        clients: "Clients",
        taxCalendar: "Tax Calendar",
        taxCalculator: "Tax Calculator",
        documents: "Documents",
        invoices: "Invoices",
        reports: "Reports",
        permits: "Permits",
        businessPermits: "Business Permits (OSS)",
        userManagement: "User Management",
        myAccount: "My Account",
        backToHome: "Back to Home",
    },
    userManagement: {
        title: "User Management",
        subtitle: "Manage user roles and access to the platform",
        table: {
            name: "Name",
            email: "Email",
            role: "Role",
            client: "Associated Client",
            actions: "Actions",
        },
        roles: {
            admin: "Advisor (Admin)",
            client: "Client (Taxpayer)",
        },
        assignClient: {
            label: "Select Client",
            placeholder: "Select client for this user",
            none: "None / Admin",
        },
        saveChanges: "Save Changes",
        cancel: "Cancel",
        updateSuccess: "User metadata updated successfully!",
        updateError: "Failed to update user metadata.",
    },

    // Not Found
    notFound: {
        heading: "404 — Not Found",
        description: "The page you're looking for is not available",
        backHome: "Back to Home",
    },

    // Language
    lang: {
        en: "English",
        id: "Bahasa Indonesia",
    },
    permits: {
        title: "Permits",
        subtitle: "Manage all permit applications centrally.",
        newCase: "New Application",
        table: {
            caseId: "Case ID",
            client: "Client",
            type: "Service",
            risk: "Risk",
            progress: "Progress",
            status: "Status",
            updated: "Updated",
        },
        status: {
            draft: "Draft",
            waitingDocument: "Waiting Document",
            verification: "Verification",
            revisionRequired: "Revision Required",
            processing: "Processing",
            issued: "Issued",
            completed: "Completed",
            cancelled: "Cancelled",
            onHold: "On Hold",
        },
    },
    businessPermits: {
        title: "Business Permits (OSS)",
        subtitle: "Manage integrated electronic business licensing applications.",
        newCase: "New Application",
        table: {
            caseId: "Case ID",
            client: "Client",
            type: "Service",
            risk: "Risk",
            progress: "Progress",
            status: "Status",
            updated: "Updated",
        },
        status: {
            draft: "Draft",
            waitingDocument: "Waiting Document",
            verification: "Verification",
            revisionRequired: "Revision Required",
            processingOSS: "Processing OSS",
            issued: "Issued",
            completed: "Completed",
            cancelled: "Cancelled",
            onHold: "On Hold",
        }
    }
};

export type Translations = typeof en;
