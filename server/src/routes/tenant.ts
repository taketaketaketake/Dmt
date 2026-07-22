import type { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";

// =============================================================================
// TENANT ROUTES (multi-tenant plan §10 step 1 — runtime branding)
// Public: the SPA fetches this on boot, pre-auth (the login page is branded).
// Sourced from env today; when the Tenant table lands, the same endpoint
// resolves the tenant from the request host and serves the same shape from
// data. Clients should treat this contract as stable.
// =============================================================================

export async function tenantRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    return reply.status(200).send({
      tenant: {
        name: env.BRAND_NAME,
        tagline: env.BRAND_TAGLINE,
        logoUrl: env.BRAND_LOGO_URL || null,
        faviconUrl: env.BRAND_FAVICON_URL || null,
        theme: env.BRAND_THEME,
      },
    });
  });
}
