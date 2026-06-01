// =============================================================================
// OBJECT STORAGE (Cloudflare R2)
// Thin wrapper over the S3-compatible API. R2 uses region "auto" and an
// account-scoped endpoint. The public URL is served from the bucket's public
// domain (r2.dev) or a custom domain configured in Cloudflare.
// =============================================================================

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/**
 * Upload an object to R2 and return its public URL.
 *
 * @param key         Object key, e.g. "portrait/portrait-abc123.jpg"
 * @param body        File bytes
 * @param contentType MIME type, used for the Content-Type response header
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${env.R2_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
}
