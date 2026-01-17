import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, authAndApproved, authAndEmployer } from "../middleware/auth.js";

// =============================================================================
// TYPES
// =============================================================================

interface CreateJobBody {
  title: string;
  companyName: string;
  description?: string;
  type: "full_time" | "part_time" | "contract" | "freelance";
  applyUrl: string;
  expiresAt?: string; // ISO date string
}

interface UpdateJobBody {
  title?: string;
  companyName?: string;
  description?: string;
  type?: "full_time" | "part_time" | "contract" | "freelance";
  applyUrl?: string;
  active?: boolean;
  expiresAt?: string;
}

interface JobIdParams {
  id: string;
}

// Default job expiration: 30 days
const DEFAULT_EXPIRY_DAYS = 30;

// =============================================================================
// JOB ROUTES
// =============================================================================

export async function jobRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // POST /api/jobs
  // Create a new job (requires employer capability)
  // ---------------------------------------------------------------------------
  app.post<{ Body: CreateJobBody }>(
    "/",
    { preHandler: authAndEmployer() },
    async (request, reply) => {
      const user = request.user!;

      // Get user's profile
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(400).send({ error: "Profile required to post jobs" });
      }

      if (profile.approvalStatus !== "approved") {
        return reply.status(403).send({ error: "Profile must be approved to post jobs" });
      }

      const { title, companyName, description, type, applyUrl, expiresAt } = request.body;

      // Validate required fields
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return reply.status(400).send({ error: "Title is required" });
      }

      if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0) {
        return reply.status(400).send({ error: "Company name is required" });
      }

      if (!type) {
        return reply.status(400).send({ error: "Job type is required" });
      }

      if (!applyUrl || typeof applyUrl !== "string" || applyUrl.trim().length === 0) {
        return reply.status(400).send({ error: "Apply URL is required" });
      }

      // Validate URL format
      try {
        new URL(applyUrl);
      } catch {
        return reply.status(400).send({ error: "Apply URL must be a valid URL" });
      }

      // Calculate expiry date
      let expiry: Date;
      if (expiresAt) {
        expiry = new Date(expiresAt);
        if (isNaN(expiry.getTime())) {
          return reply.status(400).send({ error: "Invalid expiry date" });
        }
      } else {
        expiry = new Date();
        expiry.setDate(expiry.getDate() + DEFAULT_EXPIRY_DAYS);
      }

      const job = await prisma.job.create({
        data: {
          posterId: profile.id,
          title: title.trim(),
          companyName: companyName.trim(),
          description: description?.trim() || null,
          type,
          applyUrl: applyUrl.trim(),
          expiresAt: expiry,
          active: true,
        },
      });

      return reply.status(201).send({ job });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/jobs
  // List active, non-expired jobs (approved members only)
  // ---------------------------------------------------------------------------
  app.get(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const now = new Date();

      const jobs = await prisma.job.findMany({
        where: {
          active: true,
          expiresAt: {
            gt: now,
          },
          // Only show jobs from approved profiles
          poster: {
            approvalStatus: "approved",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          companyName: true,
          description: true,
          type: true,
          applyUrl: true,
          expiresAt: true,
          createdAt: true,
          poster: {
            select: {
              id: true,
              name: true,
              handle: true,
              portraitUrl: true,
            },
          },
        },
      });

      return reply.status(200).send({ jobs });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/jobs/:id
  // View single job
  // ---------------------------------------------------------------------------
  app.get<{ Params: JobIdParams }>(
    "/:id",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const { id } = request.params;

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          poster: {
            select: {
              id: true,
              name: true,
              handle: true,
              portraitUrl: true,
              bio: true,
              approvalStatus: true,
            },
          },
        },
      });

      if (!job) {
        return reply.status(404).send({ error: "Job not found" });
      }

      // Only show if poster's profile is approved
      if (job.poster.approvalStatus !== "approved") {
        return reply.status(404).send({ error: "Job not found" });
      }

      return reply.status(200).send({ job });
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/jobs/:id
  // Update job (owner only)
  // ---------------------------------------------------------------------------
  app.put<{ Params: JobIdParams; Body: UpdateJobBody }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          poster: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!job) {
        return reply.status(404).send({ error: "Job not found" });
      }

      // Only owner can update
      if (job.poster.userId !== user.id) {
        return reply.status(403).send({ error: "Not authorized to update this job" });
      }

      const { title, companyName, description, type, applyUrl, active, expiresAt } = request.body;

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
          return reply.status(400).send({ error: "Title cannot be empty" });
        }
        updateData.title = title.trim();
      }

      if (companyName !== undefined) {
        if (typeof companyName !== "string" || companyName.trim().length === 0) {
          return reply.status(400).send({ error: "Company name cannot be empty" });
        }
        updateData.companyName = companyName.trim();
      }

      if (description !== undefined) updateData.description = description?.trim() || null;
      if (type !== undefined) updateData.type = type;

      if (applyUrl !== undefined) {
        if (typeof applyUrl !== "string" || applyUrl.trim().length === 0) {
          return reply.status(400).send({ error: "Apply URL cannot be empty" });
        }
        try {
          new URL(applyUrl);
        } catch {
          return reply.status(400).send({ error: "Apply URL must be a valid URL" });
        }
        updateData.applyUrl = applyUrl.trim();
      }

      if (active !== undefined) updateData.active = active;

      if (expiresAt !== undefined) {
        const expiry = new Date(expiresAt);
        if (isNaN(expiry.getTime())) {
          return reply.status(400).send({ error: "Invalid expiry date" });
        }
        updateData.expiresAt = expiry;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: updateData,
      });

      return reply.status(200).send({ job: updatedJob });
    }
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/jobs/:id
  // Delete job (owner or admin)
  // ---------------------------------------------------------------------------
  app.delete<{ Params: JobIdParams }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          poster: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!job) {
        return reply.status(404).send({ error: "Job not found" });
      }

      const isOwner = job.poster.userId === user.id;
      const isAdmin = user.isAdmin;

      // Only owner or admin can delete
      if (!isOwner && !isAdmin) {
        return reply.status(403).send({ error: "Not authorized to delete this job" });
      }

      await prisma.job.delete({ where: { id } });

      return reply.status(200).send({ message: "Job deleted" });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/jobs/mine
  // List own jobs (regardless of status)
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
        return reply.status(200).send({ jobs: [] });
      }

      const jobs = await prisma.job.findMany({
        where: {
          posterId: profile.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.status(200).send({ jobs });
    }
  );
}
