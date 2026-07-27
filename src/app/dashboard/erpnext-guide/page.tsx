import { redirect } from "next/navigation";
import { ERPNextGuide } from "@/components/dashboard/ERPNextGuide";
import { isAdminOrStaff } from "@/lib/auth-helpers";

export default async function ERPNextGuidePage() {
    if (!(await isAdminOrStaff())) {
        redirect("/dashboard");
    }

    return <ERPNextGuide />;
}
