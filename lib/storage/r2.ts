import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Cloudflare R2 / S3 Storage Service Configuration
 */
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "bharatedge-storage";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

/**
 * Checks whether active Cloudflare R2 credentials are fully configured
 */
export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}

let cachedS3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;

  if (!isR2Configured()) {
    console.warn(
      "[Cloudflare R2] Warning: R2 credentials missing. Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are set in .env."
    );
  }

  cachedS3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID || "placeholder"}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID || "mock-access-key",
      secretAccessKey: R2_SECRET_ACCESS_KEY || "mock-secret-key",
    },
  });

  return cachedS3Client;
}

export interface UploadOptions {
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  contentType: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
}

/**
 * Uploads a file buffer to Cloudflare R2 bucket.
 * Includes local filesystem fallback if R2 credentials are not yet configured in development.
 */
export async function uploadToR2({
  fileBuffer,
  fileName,
  contentType,
  folder = "uploads",
}: UploadOptions): Promise<UploadResult> {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueKey = `${cleanFolder}/${Date.now()}-${cleanFileName}`;
  const buffer = Buffer.from(fileBuffer);

  if (isR2Configured()) {
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    // If R2 Public URL / Custom domain is defined, use that; otherwise generate a presigned download URL
    let publicUrl = "";
    if (R2_PUBLIC_URL) {
      publicUrl = `${R2_PUBLIC_URL}/${uniqueKey}`;
    } else {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueKey,
      });
      // 7-day default presigned URL
      publicUrl = await getSignedUrl(client, getCommand, { expiresIn: 60 * 60 * 24 * 7 });
    }

    return {
      url: publicUrl,
      key: uniqueKey,
      bucket: R2_BUCKET_NAME,
      size: buffer.length,
    };
  }

  // Fallback for local development if R2 environment variables are not yet provided
  try {
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads", cleanFolder);
    await mkdir(publicUploadsDir, { recursive: true });
    const localFilePath = path.join(publicUploadsDir, `${Date.now()}-${cleanFileName}`);
    await writeFile(localFilePath, buffer);
    const localUrl = `/uploads/${cleanFolder}/${path.basename(localFilePath)}`;

    return {
      url: localUrl,
      key: uniqueKey,
      bucket: "local-dev",
      size: buffer.length,
    };
  } catch (err) {
    console.error("[Upload Fallback Error]:", err);
    throw new Error("Cloudflare R2 is not configured and local fallback failed.");
  }
}

/**
 * Generates a presigned download URL for private R2 assets
 */
export async function getPresignedR2DownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!isR2Configured()) {
    return `/uploads/${key}`;
  }

  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!isR2Configured()) {
    return true;
  }

  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error("[Delete R2 Object Error]:", err);
    return false;
  }
}
