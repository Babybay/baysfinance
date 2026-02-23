const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require("dotenv").config();

async function checkR2() {
    const s3Client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        console.log("Checking bucket:", process.env.R2_BUCKET_NAME);
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: "uploads/",
        });

        const response = await s3Client.send(command);
        console.log("R2 Response Items:", response.Contents ? response.Contents.length : 0);
        if (response.Contents) {
            response.Contents.forEach(item => {
                console.log(`- ${item.Key} (${item.Size} bytes)`);
            });
        }
    } catch (err) {
        console.error("R2 Check Error:", err);
    }
}

checkR2();
