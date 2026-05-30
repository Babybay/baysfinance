import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, buildStorageUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`Starting upload to object storage bucket: "${BUCKET_NAME}"`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `uploads/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        try {
            await s3Client.send(command);
            console.log(`Successfully uploaded ${file.name} to ${key}`);
        } catch (s3Error: unknown) {
            const error = s3Error instanceof Error ? s3Error : new Error(String(s3Error));
            console.error("S3 SDK Send Error:", {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            throw s3Error;
        }

        const publicUrl = buildStorageUrl(key);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key,
            name: file.name
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Object Storage Upload Route Error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
