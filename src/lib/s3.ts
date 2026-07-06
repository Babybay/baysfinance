import { S3Client } from "@aws-sdk/client-s3";

function env(primary: string, fallback: string): string | undefined {
    return process.env[primary] || process.env[fallback];
}

export const STORAGE_ENDPOINT = env("MINIO_ENDPOINT", "R2_ENDPOINT");
export const STORAGE_ACCESS_KEY_ID = env("MINIO_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID") || "";
export const STORAGE_SECRET_ACCESS_KEY = env("MINIO_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY") || "";
export const BUCKET_NAME = env("MINIO_BUCKET_NAME", "R2_BUCKET_NAME") || "";
export const STORAGE_PUBLIC_URL = env("MINIO_PUBLIC_URL", "R2_PUBLIC_URL") || "";

if (!STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY || !STORAGE_ENDPOINT) {
    console.warn("[s3] MinIO environment variables are missing. File uploads will fail.");
}

export const s3Client = new S3Client({
    region: process.env.MINIO_REGION || "us-east-1",
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: STORAGE_ACCESS_KEY_ID,
        secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    },
});

export function buildStorageUrl(key: string): string {
    return STORAGE_PUBLIC_URL ? `${STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${key}` : key;
}

export function extractStorageKey(input: string): string {
    if (!input.startsWith("http")) return input;

    const publicBase = STORAGE_PUBLIC_URL.replace(/\/$/, "");
    if (publicBase && input.startsWith(`${publicBase}/`)) {
        return input.slice(publicBase.length + 1);
    }

    try {
        const url = new URL(input);
        const parts = url.pathname.slice(1).split("/");
        if (parts[0] === BUCKET_NAME) {
            return parts.slice(1).join("/");
        }
        return parts.join("/");
    } catch {
        return input;
    }
}
