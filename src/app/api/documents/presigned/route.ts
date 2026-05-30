import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME, extractStorageKey } from "@/lib/s3";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rawKey = searchParams.get("key");

        if (!rawKey) {
            return NextResponse.json({ error: "Key is required" }, { status: 400 });
        }

        const key = extractStorageKey(rawKey);

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        // URL expires in 1 hour (3600 seconds)
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.json({ url });
    } catch (error) {
        console.error("Presigned URL Error:", error);
        return NextResponse.json({ error: "Gagal membuat presigned URL" }, { status: 500 });
    }
}
