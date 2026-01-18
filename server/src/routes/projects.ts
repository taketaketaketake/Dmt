import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, authAndApproved, authAndAdmin } from "../middleware/auth.js";
import { sanitizeProjectInput, sanitizeNeedContext } from "../lib/sanitize.js";
import { parsePagination, paginationMeta } from "../lib/pagination.js";

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

// Project needs types
interface NeedInput {
  categoryId: string;
  optionIds: string[];
  contextText?: string;
}

interface UpdateProjectNeedsBody {
  needs: NeedInput[];
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const URL_PATTERN = /https?:\/\/|www\.|\.com|\.org|\.net|\.io|\.co\b/i;

function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}

function validateNeedsInput(needs: NeedInput[]): { valid: boolean; error?: string } {
  // Max 3 categories
  if (needs.length > 3) {
    return { valid: false, error: "Maximum 3 need categories allowed" };
  }

  // Check for duplicate categories
  const categoryIds = needs.map((n) => n.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length) {
    return { valid: false, error: "Duplicate categories not allowed" };
  }

  for (const need of needs) {
    // Max 2 options per category
    if (need.optionIds.length > 2) {
      return { valid: false, error: "Maximum 2 options per category allowed" };
    }

    // At least 1 option required
    if (need.optionIds.length === 0) {
      return { valid: false, error: "At least 1 option required per category" };
    }

    // Context text validation
    if (need.contextText !== undefined && need.contextText !== null) {
      const trimmed = need.contextText.trim();
      if (trimmed.length > 180) {
        return { valid: false, error: "Context text must be 180 characters or less" };
      }
      if (containsUrl(trimmed)) {
        return { valid: false, error: "URLs are not allowed in context text" };
      }
    }
  }

  return { valid: true };
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

      // Sanitize all input through centralized sanitizer
      const sanitized = sanitizeProjectInput(request.body);

      if (!sanitized.title) {
        return reply.status(400).send({ error: "Title is required" });
      }

      const project = await prisma.project.create({
        data: {
          creatorId: profile.id,
          title: sanitized.title,
          description: sanitized.description,
          status: request.body.status || "active",
          websiteUrl: sanitized.websiteUrl,
          repoUrl: sanitized.repoUrl,
        },
      });

      return reply.status(201).send({ project });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/projects
  // List visible projects (creator's profile must be approved)
  // Supports pagination: ?limit=20&offset=0
  // ---------------------------------------------------------------------------
  app.get<{ Querystring: PaginationQuery }>(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const { limit, offset } = parsePagination(request.query);

      const whereClause = {
        creator: {
          approvalStatus: "approved" as const,
        },
      };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: whereClause,
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
          take: limit,
          skip: offset,
        }),
        prisma.project.count({
          where: whereClause,
        }),
      ]);

      return reply.status(200).send({
        projects,
        pagination: paginationMeta(total, limit, offset),
      });
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

      // Sanitize all input through centralized sanitizer
      const sanitized = sanitizeProjectInput(request.body);

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (sanitized.title !== undefined) {
        if (!sanitized.title) {
          return reply.status(400).send({ error: "Title cannot be empty" });
        }
        updateData.title = sanitized.title;
      }

      if (sanitized.description !== undefined) updateData.description = sanitized.description;
      if (request.body.status !== undefined) updateData.status = request.body.status;
      if (sanitized.websiteUrl !== undefined) updateData.websiteUrl = sanitized.websiteUrl;
      if (sanitized.repoUrl !== undefined) updateData.repoUrl = sanitized.repoUrl;

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

  // ---------------------------------------------------------------------------
  // GET /api/projects/:id/needs
  // Get project needs (owner, admin, or approved member if project visible)
  // ---------------------------------------------------------------------------
  app.get<{ Params: ProjectIdParams }>(
    "/:id/needs",
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
              approvalStatus: true,
            },
          },
          needs: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              options: {
                include: {
                  option: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
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
      if (!isOwner && !isAdmin) {
        // Members can only view if their account is approved
        if (!userIsApprovedMember) {
          return reply.status(403).send({ error: "Account pending approval" });
        }
        // Members can only view projects from approved profiles
        if (!creatorApproved) {
          return reply.status(404).send({ error: "Project not found" });
        }
      }

      // Transform needs data for response
      const needs = project.needs.map((need) => ({
        categoryId: need.categoryId,
        category: need.category,
        optionIds: need.options.map((o) => o.optionId),
        options: need.options.map((o) => o.option),
        contextText: need.contextText,
        updatedAt: need.updatedAt,
      }));

      return reply.status(200).send({ needs });
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/projects/:id/needs
  // Replace project needs atomically (owner only)
  // ---------------------------------------------------------------------------
  app.put<{ Params: ProjectIdParams; Body: UpdateProjectNeedsBody }>(
    "/:id/needs",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;
      const { needs } = request.body;

      // Validate input structure
      if (!Array.isArray(needs)) {
        return reply.status(400).send({ error: "needs must be an array" });
      }

      // Validate needs constraints
      const validation = validateNeedsInput(needs);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }

      // Get project with creator info
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

      // Only owner can update needs
      if (project.creator.userId !== user.id) {
        return reply.status(403).send({ error: "Not authorized to update project needs" });
      }

      // Validate that all categoryIds and optionIds exist
      if (needs.length > 0) {
        const categoryIds = needs.map((n) => n.categoryId);
        const allOptionIds = needs.flatMap((n) => n.optionIds);

        const [categories, options] = await Promise.all([
          prisma.needCategory.findMany({
            where: { id: { in: categoryIds }, active: true },
          }),
          prisma.needOption.findMany({
            where: { id: { in: allOptionIds }, active: true },
          }),
        ]);

        if (categories.length !== categoryIds.length) {
          return reply.status(400).send({ error: "Invalid category ID" });
        }

        if (options.length !== allOptionIds.length) {
          return reply.status(400).send({ error: "Invalid option ID" });
        }

        // Validate that options belong to their specified categories
        const optionCategoryMap = new Map(options.map((o) => [o.id, o.categoryId]));
        for (const need of needs) {
          for (const optionId of need.optionIds) {
            if (optionCategoryMap.get(optionId) !== need.categoryId) {
              return reply.status(400).send({
                error: "Option does not belong to specified category",
              });
            }
          }
        }
      }

      // Atomic replace: delete all existing needs and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete all existing needs for this project
        await tx.projectNeed.deleteMany({
          where: { projectId: id },
        });

        // Create new needs
        for (const need of needs) {
          const projectNeed = await tx.projectNeed.create({
            data: {
              projectId: id,
              categoryId: need.categoryId,
              contextText: sanitizeNeedContext(need.contextText),
            },
          });

          // Create option associations
          if (need.optionIds.length > 0) {
            await tx.projectNeedOption.createMany({
              data: need.optionIds.map((optionId) => ({
                projectNeedId: projectNeed.id,
                optionId,
              })),
            });
          }
        }
      });

      // Fetch updated needs to return
      const updatedNeeds = await prisma.projectNeed.findMany({
        where: { projectId: id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          options: {
            include: {
              option: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      const responseNeeds = updatedNeeds.map((need) => ({
        categoryId: need.categoryId,
        category: need.category,
        optionIds: need.options.map((o) => o.optionId),
        options: need.options.map((o) => o.option),
        contextText: need.contextText,
        updatedAt: need.updatedAt,
      }));

      return reply.status(200).send({ needs: responseNeeds });
    }
  );
}
