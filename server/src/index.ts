import "dotenv/config";
import Fastify, { type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { isAppError, isPrismaClientKnownRequestError } from "./lib/errors.js";
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
    // Structured logging with Pino
    ...(env.isProd && {
      formatters: {
        level: (label: string) => ({ level: label }),
      },
    }),
    // Pretty print in development
    ...(env.isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    }),
  },
  // Generate unique request IDs for tracing
  genReqId: () => randomUUID(),
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

// Multipart support for file uploads
await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

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

// =============================================================================
// GLOBAL ERROR HANDLER
// Catches all unhandled errors and returns consistent responses
// =============================================================================
app.setErrorHandler((error: FastifyError | Error, request, reply) => {
  // Extract user ID if authenticated
  const userId = request.user?.id;

  // Build log context
  const logContext = {
    requestId: request.id,
    method: request.method,
    url: request.url,
    userId,
    errorCode: undefined as string | undefined,
    errorName: error.name,
  };

  // Handle known application errors
  if (isAppError(error)) {
    logContext.errorCode = error.code;
    request.log.warn(logContext, `Client error: ${error.message}`);

    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    });
  }

  // Handle Prisma known errors (unique constraint, foreign key, etc.)
  if (isPrismaClientKnownRequestError(error)) {
    logContext.errorCode = error.code;

    // P2002 = Unique constraint violation
    if (error.code === "P2002") {
      request.log.warn(logContext, "Unique constraint violation");
      return reply.status(409).send({
        error: "Resource already exists",
        code: "CONFLICT",
      });
    }

    // P2025 = Record not found
    if (error.code === "P2025") {
      request.log.warn(logContext, "Record not found");
      return reply.status(404).send({
        error: "Resource not found",
        code: "NOT_FOUND",
      });
    }

    // Other Prisma errors
    request.log.error({ ...logContext, stack: error }, "Database error");
    return reply.status(500).send({
      error: env.isProd ? "An unexpected error occurred" : `Database error: ${error.code}`,
      code: "DATABASE_ERROR",
    });
  }

  // Handle validation errors from Fastify
  if ("validation" in error && error.validation) {
    request.log.warn(logContext, `Validation error: ${error.message}`);
    return reply.status(400).send({
      error: error.message,
      code: "VALIDATION_ERROR",
    });
  }

  // Handle all other unexpected errors
  request.log.error(
    {
      ...logContext,
      stack: error.stack,
      errorMessage: error.message,
    },
    "Unexpected server error"
  );

  // In production, don't leak internal error details
  return reply.status(500).send({
    error: env.isProd ? "An unexpected error occurred" : error.message,
    code: "INTERNAL_ERROR",
  });
});

// Add request context logging hook
app.addHook("onRequest", async (request) => {
  // Bind user ID to child logger when available (after auth middleware runs)
  if (request.user?.id) {
    request.log = request.log.child({ userId: request.user.id });
  }
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

// Health check — verifies database connectivity for load balancers
app.get("/health", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (err) {
    app.log.error({ err }, "Health check failed: database unreachable");
    return reply.status(503).send({ status: "error", message: "Database unreachable" });
  }
});

// Serve frontend build in production
// In dev, Vite dev server handles this via proxy
const WEB_DIST = join(process.cwd(), "..", "web", "dist");
if (env.isProd && existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, {
    root: WEB_DIST,
    prefix: "/",
    wildcard: false,
    decorateReply: false,
  });

  // SPA fallback: serve index.html for unmatched routes (client-side routing)
  app.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile("index.html", WEB_DIST);
  });
}

// Catch unhandled rejections to prevent process crashes
process.on("unhandledRejection", (reason) => {
  app.log.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  app.log.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
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
