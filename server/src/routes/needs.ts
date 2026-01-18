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
  // ---------------------------------------------------------------------------
  app.get("/taxonomy", async (_request, reply) => {
    const categories = await prisma.needCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        options: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
        },
      },
    });

    return reply.status(200).send({ categories });
  });
}
