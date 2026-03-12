import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";

const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Extract the R2 object key from either a full URL or a raw key.
 *
 * Handles:
 *   - Full URL: "https://xxx.r2.cloudflarestorage.com/bucket/accounting-docs/..."
 *   - Public URL: "https://pub-xxx.r2.dev/accounting-docs/..."
 *   - Raw key: "accounting-docs/c1/file.jpg"
 */
function extractKey(input: string): string {
    // If it starts with http, strip the domain + optional bucket prefix
    if (input.startsWith("http")) {
        // Strip R2_PUBLIC_URL prefix if present
        if (PUBLIC_URL && input.startsWith(PUBLIC_URL)) {
            return input.slice(PUBLIC_URL.length + 1); // +1 for the "/"
        }
        // Generic: take everything after the 3rd slash (host/bucket/KEY...)
        // e.g. https://xxx.r2.cloudflarestorage.com/bucket-name/key/path
        try {
            const url = new URL(input);
            // pathname is "/bucket-name/key..." — strip leading "/"
            const parts = url.pathname.slice(1).split("/");
            // If first part looks like a bucket name (matches BUCKET_NAME), skip it
            if (parts[0] === BUCKET_NAME) {
                return parts.slice(1).join("/");
            }
            return parts.join("/");
        } catch {
            return input;
        }
    }
    return input;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rawKey = searchParams.get("key");

        if (!rawKey) {
            return NextResponse.json({ error: "Key is required" }, { status: 400 });
        }

        const key = extractKey(rawKey);

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
