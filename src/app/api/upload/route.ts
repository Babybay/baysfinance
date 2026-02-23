import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`Starting upload to R2 bucket: "${BUCKET_NAME}"`);
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
        } catch (s3Error: any) {
            console.error("S3 SDK Send Error:", {
                message: s3Error.message,
                code: s3Error.code,
                name: s3Error.name,
                stack: s3Error.stack
            });
            throw s3Error;
        }

        // If bucket is public, return the URL. If private, return the Key.
        const publicUrl = process.env.R2_PUBLIC_URL
            ? `${process.env.R2_PUBLIC_URL}/${key}`
            : key;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key,
            name: file.name
        });
    } catch (error: any) {
        console.error("R2 Upload Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
