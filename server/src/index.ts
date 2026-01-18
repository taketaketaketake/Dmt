import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profiles.js";
import { projectRoutes } from "./routes/projects.js";
import { favoritesRoutes } from "./routes/favorites.js";
import { followsRoutes } from "./routes/follows.js";
import { jobRoutes } from "./routes/jobs.js";
import { apiRoutes } from "./routes/api.js";
import { adminRoutes } from "./routes/admin.js";
import { billingRoutes } from "./routes/billing.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { uploadRoutes } from "./routes/uploads.js";
import { needsRoutes } from "./routes/needs.js";

const app = Fastify({
  logger: {
    level: env.isDev ? "debug" : "info",
  },
  // Request body size limits
  bodyLimit: 1048576, // 1MB default for JSON
});

// Add raw body support for webhook signature verification
// This adds rawBody to requests with application/json content type
app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (req, body: Buffer, done) => {
    // Store raw body for webhook verification
    (req as unknown as { rawBody: Buffer }).rawBody = body;
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

// Add multipart support for file uploads (returns raw buffer)
app.addContentTypeParser(
  "multipart/form-data",
  { parseAs: "buffer" },
  (_req, body: Buffer, done) => {
    done(null, body);
  }
);

// Plugins
await app.register(cookie, {
  secret: env.SESSION_SECRET,
  parseOptions: {},
});

await app.register(cors, {
  origin: env.isDev ? true : env.APP_URL,
  credentials: true,
});

// Security headers
await app.register(helmet, {
  // Allow inline scripts for dev, stricter in prod
  contentSecurityPolicy: env.isProd
    ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      }
    : false,
  // Prevent clickjacking
  frameguard: { action: "deny" },
  // Hide X-Powered-By
  hidePoweredBy: true,
  // Prevent MIME sniffing
  noSniff: true,
  // XSS filter
  xssFilter: true,
});

// Global rate limiting
await app.register(rateLimit, {
  max: 100, // 100 requests per window
  timeWindow: "1 minute",
  // Use IP address for rate limiting
  keyGenerator: (request) => {
    return request.ip;
  },
  // Skip rate limiting for health checks
  allowList: (request) => {
    return request.url === "/health";
  },
  // Custom error response
  errorResponseBuilder: () => {
    return {
      error: "Too many requests, please slow down",
      statusCode: 429,
    };
  },
});

// Static file serving for uploads
await app.register(fastifyStatic, {
  root: join(process.cwd(), "uploads"),
  prefix: "/uploads/",
  decorateReply: false,
});

// Routes
await app.register(authRoutes, { prefix: "/auth" });
await app.register(profileRoutes, { prefix: "/api/profiles" });
await app.register(projectRoutes, { prefix: "/api/projects" });
await app.register(favoritesRoutes, { prefix: "/api/favorites" });
await app.register(followsRoutes, { prefix: "/api/follows" });
await app.register(jobRoutes, { prefix: "/api/jobs" });
await app.register(apiRoutes, { prefix: "/api" });
await app.register(adminRoutes, { prefix: "/admin" });
await app.register(billingRoutes, { prefix: "/billing" });
await app.register(webhookRoutes, { prefix: "/webhooks" });
await app.register(uploadRoutes, { prefix: "/api/uploads" });
await app.register(needsRoutes, { prefix: "/api/needs" });

// Health check
app.get("/health", async () => {
  return { status: "ok" };
});

// Graceful shutdown
const shutdown = async () => {
  app.log.info("Shutting down...");
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
