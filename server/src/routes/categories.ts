import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

// =============================================================================
// CATEGORIES ROUTES
// Controlled vocabularies from the generic Category table (e.g. project
// industries). Public reference data, like the needs taxonomy.
// =============================================================================

const VALID_TYPES = ["skill", "industry", "project_type"] as const;
type CategoryType = (typeof VALID_TYPES)[number];

export async function categoryRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/categories?type=industry
  // List categories of a given type (defaults to industry).
  // ---------------------------------------------------------------------------
  app.get<{ Querystring: { type?: string } }>("/", async (request, reply) => {
    const requested = request.query.type;
    const type: CategoryType = VALID_TYPES.includes(requested as CategoryType)
      ? (requested as CategoryType)
      : "industry";

    const categories = await prisma.category.findMany({
      where: { type },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, type: true },
    });

    return reply.status(200).send({ categories });
  });
}
