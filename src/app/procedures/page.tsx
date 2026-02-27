import { OfficialProcedures } from "@/components/OfficialProcedures";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
    title: "Official Permit Procedures — Bay'sConsult",
    description: "Step-by-step guide to Indonesian business permit procedures based on OSS-RBA government regulations. Required documents, risk categories, and FAQ.",
};

export default function ProceduresPage() {
    return (
        <>
            <Navbar />
            <OfficialProcedures />
            <Footer />
        </>
    );
}
