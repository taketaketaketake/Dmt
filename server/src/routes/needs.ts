import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

// =============================================================================
// NEEDS ROUTES
// =============================================================================

export async function needsRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/needs/taxonomy
  // Get the full needs taxonomy (categories and options)
  // Public endpoint (no auth required) - taxonomy is static reference data
  // ?offerable=1 returns only options a person can offer as a skill, dropping
  // categories that have no offerable options (used by the people skills picker
  // and the /people filter).
  // ---------------------------------------------------------------------------
  app.get<{ Querystring: { offerable?: string } }>("/taxonomy", async (request, reply) => {
    const onlyOfferable =
      request.query.offerable === "1" || request.query.offerable === "true";

    const categories = await prisma.needCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        options: {
          where: { active: true, ...(onlyOfferable ? { offerable: true } : {}) },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
            offerable: true,
          },
        },
      },
    });

    // When filtering to offerable options, hide categories left with none
    const result = onlyOfferable
      ? categories.filter((c) => c.options.length > 0)
      : categories;

    return reply.status(200).send({ categories: result });
  });
}
