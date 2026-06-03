import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import { join } from "path";
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
import { categoryRoutes } from "./routes/categories.js";

// =============================================================================
// BUILD APP
// =============================================================================

export interface BuildAppOptions {
  enableRateLimit?: boolean;
  enableStaticFiles?: boolean;
  logger?: boolean | object;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const {
    enableRateLimit: shouldRateLimit = true,
    enableStaticFiles: shouldServeStatic = true,
    logger = true,
  } = options;

  const app = Fastify({
    logger,
    genReqId: () => randomUUID(),
    bodyLimit: 1048576, // 1MB default for JSON
  });

  // Add raw body support for webhook signature verification
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body: Buffer, done) => {
      (req as unknown as { rawBody: Buffer }).rawBody = body;
      try {
        const json = body.length > 0 ? JSON.parse(body.toString()) : {};
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
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  });

  // Response compression (gzip/brotli). Shrinks JSON API payloads and, in prod,
  // the served JS/CSS bundle. Only compresses bodies above the threshold so we
  // don't waste CPU on tiny responses.
  await app.register(compress, {
    global: true,
    threshold: 1024,
  });

  // Global rate limiting (optional for tests)
  if (shouldRateLimit) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      keyGenerator: (request) => request.ip,
      allowList: (request) => request.url === "/health",
      errorResponseBuilder: () => ({
        error: "Too many requests, please slow down",
        statusCode: 429,
      }),
    });
  }

  // Static file serving for uploads (optional for tests)
  if (shouldServeStatic) {
    await app.register(fastifyStatic, {
      root: join(process.cwd(), "uploads"),
      prefix: "/uploads/",
      decorateReply: false,
    });
  }

  // =============================================================================
  // GLOBAL ERROR HANDLER
  // =============================================================================
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const userId = request.user?.id;

    const logContext = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      userId,
      errorCode: undefined as string | undefined,
      errorName: error.name,
    };

    if (isAppError(error)) {
      logContext.errorCode = error.code;
      request.log.warn(logContext, `Client error: ${error.message}`);
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    if (isPrismaClientKnownRequestError(error)) {
      logContext.errorCode = error.code;

      if (error.code === "P2002") {
        request.log.warn(logContext, "Unique constraint violation");
        return reply.status(409).send({
          error: "Resource already exists",
          code: "CONFLICT",
        });
      }

      if (error.code === "P2025") {
        request.log.warn(logContext, "Record not found");
        return reply.status(404).send({
          error: "Resource not found",
          code: "NOT_FOUND",
        });
      }

      request.log.error({ ...logContext, stack: error }, "Database error");
      return reply.status(500).send({
        error: env.isProd ? "An unexpected error occurred" : `Database error: ${error.code}`,
        code: "DATABASE_ERROR",
      });
    }

    if ("validation" in error && error.validation) {
      request.log.warn(logContext, `Validation error: ${error.message}`);
      return reply.status(400).send({
        error: error.message,
        code: "VALIDATION_ERROR",
      });
    }

    request.log.error(
      {
        ...logContext,
        stack: error.stack,
        errorMessage: error.message,
      },
      "Unexpected server error"
    );

    return reply.status(500).send({
      error: env.isProd ? "An unexpected error occurred" : error.message,
      code: "INTERNAL_ERROR",
    });
  });

  // Add request context logging hook
  app.addHook("onRequest", async (request) => {
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
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(billingRoutes, { prefix: "/billing" });
  await app.register(webhookRoutes, { prefix: "/webhooks" });
  await app.register(uploadRoutes, { prefix: "/api/uploads" });
  await app.register(needsRoutes, { prefix: "/api/needs" });
  await app.register(categoryRoutes, { prefix: "/api/categories" });

  // Health check
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (err) {
      app.log.error({ err }, "Health check failed: database unreachable");
      return reply.status(503).send({ status: "error", message: "Database unreachable" });
    }
  });

  return app;
}
