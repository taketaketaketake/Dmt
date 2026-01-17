import type { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../lib/env.js";

// Upload directory - in production, use cloud storage
const UPLOAD_DIR = join(process.cwd(), "uploads");

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
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

    // Parse multipart data manually
    const contentType = request.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return reply.status(400).send({ error: "Expected multipart/form-data" });
    }

    // Get raw body
    const rawBody = await request.body as Buffer;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      return reply.status(400).send({ error: "No file data received" });
    }

    // Extract boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return reply.status(400).send({ error: "Invalid multipart boundary" });
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    // Parse multipart
    const parts = parseMultipart(rawBody, boundary);
    const filePart = parts.find((p) => p.filename);

    if (!filePart || !filePart.data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    // Validate file type
    const mimeType = filePart.contentType || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return reply.status(400).send({
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      });
    }

    // Validate file size
    if (filePart.data.length > MAX_FILE_SIZE) {
      return reply.status(400).send({
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Generate unique filename
    const ext = extname(filePart.filename || ".jpg") || ".jpg";
    const filename = `${uploadType}-${nanoid(12)}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save file
    await writeFile(filepath, filePart.data);

    // Return URL
    const url = env.isDev
      ? `http://localhost:${env.PORT}/uploads/${filename}`
      : `${env.APP_URL}/uploads/${filename}`;

    return { url, filename };
  });
};

// Simple multipart parser
interface MultipartPart {
  name?: string;
  filename?: string;
  contentType?: string;
  data?: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);

  let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < body.length) {
    // Find end of this part
    let end = body.indexOf(boundaryBuffer, start);
    if (end === -1) {
      end = body.indexOf(endBoundary, start);
      if (end === -1) break;
    }

    const partData = body.slice(start, end);
    const part = parsePart(partData);
    if (part) parts.push(part);

    start = end + boundaryBuffer.length;
    if (body.slice(end, end + endBoundary.length).equals(endBoundary)) break;
  }

  return parts;
}

function parsePart(data: Buffer): MultipartPart | null {
  // Find header/body separator (double CRLF)
  const separator = Buffer.from("\r\n\r\n");
  const sepIndex = data.indexOf(separator);
  if (sepIndex === -1) return null;

  const headerSection = data.slice(0, sepIndex).toString();
  const bodyData = data.slice(sepIndex + 4, data.length - 2); // Remove trailing CRLF

  const part: MultipartPart = {};

  // Parse headers
  const headers = headerSection.split("\r\n");
  for (const header of headers) {
    if (header.toLowerCase().startsWith("content-disposition:")) {
      const nameMatch = header.match(/name="([^"]+)"/);
      const filenameMatch = header.match(/filename="([^"]+)"/);
      if (nameMatch) part.name = nameMatch[1];
      if (filenameMatch) part.filename = filenameMatch[1];
    } else if (header.toLowerCase().startsWith("content-type:")) {
      part.contentType = header.split(":")[1]?.trim();
    }
  }

  part.data = bodyData;
  return part;
}
