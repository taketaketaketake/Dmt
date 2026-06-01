import type { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../lib/env.js";
import { putObject } from "../lib/storage.js";

// Local fallback directory, used only when R2 is not configured (dev).
const UPLOAD_DIR = join(process.cwd(), "uploads");

// Allowed image types and their canonical extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const ALLOWED_TYPES = Object.keys(MIME_TO_EXT);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  // Ensure the local fallback directory exists when R2 is not configured.
  if (!env.isR2Configured && !existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Upload image
  app.post<{
    Querystring: { type?: "portrait" | "project" };
  }>("/image", { preHandler: requireAuth }, async (request, reply) => {
    const uploadType = request.query.type || "portrait";

    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return reply.status(400).send({
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      });
    }

    // Read file data
    const buffer = await file.toBuffer();

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(400).send({
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Derive extension from validated MIME type, not user-supplied filename
    const ext = MIME_TO_EXT[file.mimetype];
    const filename = `${uploadType}-${nanoid(12)}${ext}`;

    // Production (and any env with R2 configured): store in Cloudflare R2.
    if (env.isR2Configured) {
      const key = `${uploadType}/${filename}`;
      const url = await putObject(key, buffer, file.mimetype);
      return { url, filename };
    }

    // Dev fallback: write to local disk and serve via /uploads static route.
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `http://localhost:${env.PORT}/uploads/${filename}`;
    return { url, filename };
  });
};
