import type { FastifyInstance } from "fastify";
import { authAndApproved } from "../middleware/auth.js";

// =============================================================================
// API ROUTES
// Stub file for future phases
// =============================================================================

export async function apiRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // PROFILES - DONE (see routes/profiles.ts)
  // Registered at /api/profiles
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // PROJECTS - DONE (see routes/projects.ts)
  // Registered at /api/projects
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // FAVORITES - DONE (see routes/favorites.ts)
  // Registered at /api/favorites
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // FOLLOWS - DONE (see routes/follows.ts)
  // Registered at /api/follows
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // JOBS - DONE (see routes/jobs.ts)
  // Registered at /api/jobs
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // TODO: Phase 5 - Implement category endpoints
  // ---------------------------------------------------------------------------

  // GET /api/categories - List all categories
  // POST /api/categories - Create category (admin only)
  // PUT /api/categories/:id - Update category (admin only)
  // DELETE /api/categories/:id - Delete category (admin only)

  // ---------------------------------------------------------------------------
  // SEARCH
  // TODO: Phase 5 - Implement basic Postgres FTS
  // ---------------------------------------------------------------------------

  // GET /api/search?q=query - Search profiles and projects

  // Placeholder route to confirm API is mounted
  app.get("/ping", { preHandler: authAndApproved() }, async () => {
    return { pong: true };
  });
}
