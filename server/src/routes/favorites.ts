import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authAndApproved } from "../middleware/auth.js";

// =============================================================================
// TYPES
// =============================================================================

interface ProfileIdParams {
  profileId: string;
}

// =============================================================================
// FAVORITES ROUTES
// Private bookmarks for people. Not visible to others.
// =============================================================================

export async function favoritesRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/favorites
  // List own favorited profiles
  // ---------------------------------------------------------------------------
  app.get(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      const favorites = await prisma.userFavorite.findMany({
        where: {
          userId: user.id,
          // Only include favorites where the profile is still approved
          profile: {
            approvalStatus: "approved",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          profile: {
            select: {
              id: true,
              name: true,
              handle: true,
              bio: true,
              location: true,
              portraitUrl: true,
            },
          },
        },
      });

      return reply.status(200).send({ favorites });
    }
  );

  // ---------------------------------------------------------------------------
  // POST /api/favorites/:profileId
  // Add a profile to favorites
  // ---------------------------------------------------------------------------
  app.post<{ Params: ProfileIdParams }>(
    "/:profileId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { profileId } = request.params;

      // Check profile exists and is approved
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      if (profile.approvalStatus !== "approved") {
        return reply.status(404).send({ error: "Profile not found" });
      }

      // Can't favorite yourself
      if (profile.userId === user.id) {
        return reply.status(400).send({ error: "Cannot favorite your own profile" });
      }

      // Check if already favorited
      const existing = await prisma.userFavorite.findUnique({
        where: {
          userId_profileId: {
            userId: user.id,
            profileId: profileId,
          },
        },
      });

      if (existing) {
        return reply.status(200).send({ message: "Already favorited", favorite: existing });
      }

      // Create favorite
      const favorite = await prisma.userFavorite.create({
        data: {
          userId: user.id,
          profileId: profileId,
        },
      });

      return reply.status(201).send({ favorite });
    }
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/favorites/:profileId
  // Remove a profile from favorites
  // ---------------------------------------------------------------------------
  app.delete<{ Params: ProfileIdParams }>(
    "/:profileId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { profileId } = request.params;

      // Find and delete the favorite
      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_profileId: {
            userId: user.id,
            profileId: profileId,
          },
        },
      });

      if (!favorite) {
        return reply.status(404).send({ error: "Favorite not found" });
      }

      await prisma.userFavorite.delete({
        where: { id: favorite.id },
      });

      return reply.status(200).send({ message: "Favorite removed" });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/favorites/check/:profileId
  // Check if a profile is favorited (for UI state)
  // ---------------------------------------------------------------------------
  app.get<{ Params: ProfileIdParams }>(
    "/check/:profileId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { profileId } = request.params;

      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_profileId: {
            userId: user.id,
            profileId: profileId,
          },
        },
      });

      return reply.status(200).send({ favorited: !!favorite });
    }
  );
}
