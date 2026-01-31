import type { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../lib/env.js";

// Upload directory - in production, use cloud storage
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
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
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
    const filepath = join(UPLOAD_DIR, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Return URL
    const url = env.isDev
      ? `http://localhost:${env.PORT}/uploads/${filename}`
      : `${env.APP_URL}/uploads/${filename}`;

    return { url, filename };
  });
};
