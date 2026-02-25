"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BusinessPermitDetailRedirect() {
    const router = useRouter();
    const { id } = useParams();
    useEffect(() => {
        router.replace(`/dashboard/permits/${id}`);
    }, [router, id]);
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
    );
}
