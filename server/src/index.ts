import "dotenv/config";
import { existsSync } from "fs";
import { join } from "path";
import fastifyStatic from "@fastify/static";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { buildApp } from "./app.js";

const app = await buildApp({
  enableRateLimit: true,
  enableStaticFiles: true,
  logger: {
    level: env.isDev ? "debug" : "info",
    ...(env.isProd && {
      formatters: {
        level: (label: string) => ({ level: label }),
      },
    }),
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
});

// Serve frontend build in production
const WEB_DIST = join(process.cwd(), "..", "web", "dist");
if (env.isProd && existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, {
    root: WEB_DIST,
    prefix: "/",
    wildcard: false,
    // decorateReply must stay enabled: the SPA fallback below relies on
    // reply.sendFile(). With it disabled, every client-side route (e.g.
    // /people) and missing asset (e.g. /favicon.ico) threw a 500.
    setHeaders: (res, filePath) => {
      // Vite emits content-hashed files under /assets, so they can be cached
      // forever — a new deploy changes the filename. index.html (and any other
      // unhashed root file) must always revalidate so clients pick up the new
      // asset references after a deploy.
      if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
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
