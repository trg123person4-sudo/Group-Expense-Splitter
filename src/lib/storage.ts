import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function uploadReceiptImage(
  buffer: Buffer,
  originalFilename: string = "receipt.jpg",
  mimeType: string = "image/jpeg"
): Promise<string> {
  const extension = path.extname(originalFilename) || ".jpg";
  const uniqueKey = `receipts/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "auto";
  const endpoint = process.env.AWS_ENDPOINT; // Supports Cloudflare R2
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_URL;

  // 1. If real S3/R2 object storage credentials are provided, upload to bucket
  if (bucket && accessKeyId && secretAccessKey) {
    try {
      const s3 = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: uniqueKey,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      if (publicBaseUrl) {
        return `${publicBaseUrl.replace(/\/$/, "")}/${uniqueKey}`;
      }
      if (endpoint) {
        return `${endpoint.replace(/\/$/, "")}/${bucket}/${uniqueKey}`;
      }
      return `https://${bucket}.s3.${region}.amazonaws.com/${uniqueKey}`;
    } catch (err) {
      console.warn("S3/R2 upload failed, falling back to local file storage:", err);
    }
  }

  // 2. Local object storage fallback: save to public/uploads/
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const localFileName = path.basename(uniqueKey);
  const localFilePath = path.join(uploadsDir, localFileName);
  await fs.writeFile(localFilePath, buffer);

  return `/uploads/${localFileName}`;
}
