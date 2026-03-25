import { S3Client } from "@aws-sdk/client-s3";

const R2_REQUIRED_VARS = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET_NAME"] as const;

// Fail fast: throw at startup if R2 env vars are missing (prevents silent upload failures)
if (process.env.NODE_ENV === "production") {
    const missing = R2_REQUIRED_VARS.filter((v) => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
    }
} else if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
    console.warn("[s3] Cloudflare R2 environment variables are missing. File uploads will fail.");
}

export const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
