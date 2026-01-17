import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authAndApproved } from "../middleware/auth.js";

// =============================================================================
// TYPES
// =============================================================================

interface ProjectIdParams {
  projectId: string;
}

// =============================================================================
// FOLLOWS ROUTES
// Private bookmarks for projects. Not visible to others.
// =============================================================================

export async function followsRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/follows
  // List own followed projects
  // ---------------------------------------------------------------------------
  app.get(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      const follows = await prisma.projectFollow.findMany({
        where: {
          userId: user.id,
          // Only include follows where the project's creator is still approved
          project: {
            creator: {
              approvalStatus: "approved",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              websiteUrl: true,
              creator: {
                select: {
                  id: true,
                  name: true,
                  handle: true,
                  portraitUrl: true,
                },
              },
            },
          },
        },
      });

      return reply.status(200).send({ follows });
    }
  );

  // ---------------------------------------------------------------------------
  // POST /api/follows/:projectId
  // Follow a project
  // ---------------------------------------------------------------------------
  app.post<{ Params: ProjectIdParams }>(
    "/:projectId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { projectId } = request.params;

      // Check project exists and creator is approved
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          creator: {
            select: {
              userId: true,
              approvalStatus: true,
            },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      if (project.creator.approvalStatus !== "approved") {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Can't follow your own project
      if (project.creator.userId === user.id) {
        return reply.status(400).send({ error: "Cannot follow your own project" });
      }

      // Check if already following
      const existing = await prisma.projectFollow.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: projectId,
          },
        },
      });

      if (existing) {
        return reply.status(200).send({ message: "Already following", follow: existing });
      }

      // Create follow
      const follow = await prisma.projectFollow.create({
        data: {
          userId: user.id,
          projectId: projectId,
        },
      });

      return reply.status(201).send({ follow });
    }
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/follows/:projectId
  // Unfollow a project
  // ---------------------------------------------------------------------------
  app.delete<{ Params: ProjectIdParams }>(
    "/:projectId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { projectId } = request.params;

      // Find and delete the follow
      const follow = await prisma.projectFollow.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: projectId,
          },
        },
      });

      if (!follow) {
        return reply.status(404).send({ error: "Follow not found" });
      }

      await prisma.projectFollow.delete({
        where: { id: follow.id },
      });

      return reply.status(200).send({ message: "Unfollowed" });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/follows/check/:projectId
  // Check if a project is followed (for UI state)
  // ---------------------------------------------------------------------------
  app.get<{ Params: ProjectIdParams }>(
    "/check/:projectId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { projectId } = request.params;

      const follow = await prisma.projectFollow.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: projectId,
          },
        },
      });

      return reply.status(200).send({ following: !!follow });
    }
  );
}
