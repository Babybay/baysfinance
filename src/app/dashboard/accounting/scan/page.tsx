import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ScanPageView } from "./ScanPageView";

export default async function ScanPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    return <ScanPageView />;
}
