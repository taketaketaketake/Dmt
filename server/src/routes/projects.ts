import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, authAndApproved, authAndAdmin } from "../middleware/auth.js";

// =============================================================================
// TYPES
// =============================================================================

interface CreateProjectBody {
  title: string;
  description?: string;
  status?: "active" | "completed" | "archived";
  websiteUrl?: string;
  repoUrl?: string;
}

interface UpdateProjectBody {
  title?: string;
  description?: string;
  status?: "active" | "completed" | "archived";
  websiteUrl?: string;
  repoUrl?: string;
}

interface ProjectIdParams {
  id: string;
}

// =============================================================================
// PROJECT ROUTES
// =============================================================================

export async function projectRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // POST /api/projects
  // Create a new project (requires approved profile)
  // ---------------------------------------------------------------------------
  app.post<{ Body: CreateProjectBody }>(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      // Get user's profile
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(400).send({ error: "Profile required to create projects" });
      }

      if (profile.approvalStatus !== "approved") {
        return reply.status(403).send({ error: "Profile must be approved to create projects" });
      }

      const { title, description, status, websiteUrl, repoUrl } = request.body;

      // Validate required fields
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return reply.status(400).send({ error: "Title is required" });
      }

      const project = await prisma.project.create({
        data: {
          creatorId: profile.id,
          title: title.trim(),
          description: description?.trim() || null,
          status: status || "active",
          websiteUrl: websiteUrl?.trim() || null,
          repoUrl: repoUrl?.trim() || null,
        },
      });

      return reply.status(201).send({ project });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/projects
  // List visible projects (creator's profile must be approved)
  // ---------------------------------------------------------------------------
  app.get(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      // Only show projects where creator's profile is approved
      const projects = await prisma.project.findMany({
        where: {
          creator: {
            approvalStatus: "approved",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          websiteUrl: true,
          repoUrl: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              handle: true,
              portraitUrl: true,
            },
          },
        },
      });

      return reply.status(200).send({ projects });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/projects/:id
  // View single project
  // - Members can view if creator's profile is approved
  // - Owners can view their own projects
  // - Admins can view any project
  // ---------------------------------------------------------------------------
  app.get<{ Params: ProjectIdParams }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              userId: true,
              name: true,
              handle: true,
              portraitUrl: true,
              approvalStatus: true,
            },
          },
          // TODO: Phase 4+ - Include collaborators when implemented
        },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Check access
      const isOwner = project.creator.userId === user.id;
      const isAdmin = user.isAdmin;
      const creatorApproved = project.creator.approvalStatus === "approved";
      const userIsApprovedMember = user.status === "approved";

      // Owners and admins can always view
      if (isOwner || isAdmin) {
        return reply.status(200).send({ project });
      }

      // Members can only view if their account is approved
      if (!userIsApprovedMember) {
        return reply.status(403).send({ error: "Account pending approval" });
      }

      // Members can only view projects from approved profiles
      if (!creatorApproved) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return reply.status(200).send({ project });
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/projects/:id
  // Update project (owner only)
  // ---------------------------------------------------------------------------
  app.put<{ Params: ProjectIdParams; Body: UpdateProjectBody }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Only owner can update
      if (project.creator.userId !== user.id) {
        return reply.status(403).send({ error: "Not authorized to update this project" });
      }

      const { title, description, status, websiteUrl, repoUrl } = request.body;

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
          return reply.status(400).send({ error: "Title cannot be empty" });
        }
        updateData.title = title.trim();
      }

      if (description !== undefined) updateData.description = description?.trim() || null;
      if (status !== undefined) updateData.status = status;
      if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl?.trim() || null;
      if (repoUrl !== undefined) updateData.repoUrl = repoUrl?.trim() || null;

      const updatedProject = await prisma.project.update({
        where: { id },
        data: updateData,
      });

      return reply.status(200).send({ project: updatedProject });
    }
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/projects/:id
  // Delete project (owner or admin)
  // ---------------------------------------------------------------------------
  app.delete<{ Params: ProjectIdParams }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const isOwner = project.creator.userId === user.id;
      const isAdmin = user.isAdmin;

      // Only owner or admin can delete
      if (!isOwner && !isAdmin) {
        return reply.status(403).send({ error: "Not authorized to delete this project" });
      }

      await prisma.project.delete({ where: { id } });

      return reply.status(200).send({ message: "Project deleted" });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/projects/mine
  // List own projects (regardless of profile approval status)
  // ---------------------------------------------------------------------------
  app.get(
    "/mine",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(200).send({ projects: [] });
      }

      const projects = await prisma.project.findMany({
        where: {
          creatorId: profile.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.status(200).send({ projects });
    }
  );
}
