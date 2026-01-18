import type { FastifyInstance } from "fastify";
import { authAndAdmin } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { sendProfileApprovedEmail, sendProfileRejectedEmail, sendNeedReminderEmail } from "../lib/resend.js";

// =============================================================================
// TYPES
// =============================================================================

interface ProfileIdParams {
  id: string;
}

interface RejectProfileBody {
  note?: string;
}

// =============================================================================
// ADMIN ROUTES
// =============================================================================

export async function adminRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // APPROVAL QUEUE
  // ---------------------------------------------------------------------------

  // GET /admin/profiles/pending
  // List profiles pending review
  app.get(
    "/profiles/pending",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const profiles = await prisma.profile.findMany({
        where: {
          approvalStatus: "pending_review",
        },
        orderBy: {
          updatedAt: "asc", // Oldest first (FIFO queue)
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });

      return reply.status(200).send({ profiles });
    }
  );

  // GET /admin/profiles/:id
  // Get any profile by ID (admin only)
  app.get<{ Params: ProfileIdParams }>(
    "/profiles/:id",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      return reply.status(200).send({ profile });
    }
  );

  // POST /admin/profiles/:id/approve
  // Approve a profile (pending_review -> approved)
  // Also approves the user account if pending
  app.post<{ Params: ProfileIdParams }>(
    "/profiles/:id/approve",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      if (profile.approvalStatus !== "pending_review") {
        return reply.status(400).send({
          error: `Cannot approve profile with status: ${profile.approvalStatus}`
        });
      }

      // Transaction: approve profile and user
      const [updatedProfile] = await prisma.$transaction([
        // Approve profile
        prisma.profile.update({
          where: { id },
          data: {
            approvalStatus: "approved",
            approvedAt: new Date(),
            rejectionNote: null,
          },
        }),
        // Also approve user if they were pending
        prisma.user.update({
          where: { id: profile.userId },
          data: {
            status: "approved",
          },
        }),
      ]);

      // Send approval email
      await sendProfileApprovedEmail({
        to: profile.user.email,
        profileName: profile.name,
      });

      return reply.status(200).send({
        profile: updatedProfile,
        message: "Profile approved"
      });
    }
  );

  // POST /admin/profiles/:id/reject
  // Reject a profile (pending_review -> rejected)
  // Optionally include a note explaining why
  app.post<{ Params: ProfileIdParams; Body: RejectProfileBody }>(
    "/profiles/:id/reject",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;
      const { note } = request.body || {};

      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      if (profile.approvalStatus !== "pending_review") {
        return reply.status(400).send({
          error: `Cannot reject profile with status: ${profile.approvalStatus}`
        });
      }

      const updatedProfile = await prisma.profile.update({
        where: { id },
        data: {
          approvalStatus: "rejected",
          rejectionNote: note?.trim() || null,
        },
      });

      // Send rejection email
      await sendProfileRejectedEmail({
        to: profile.user.email,
        profileName: profile.name,
        rejectionNote: note?.trim(),
      });

      return reply.status(200).send({
        profile: updatedProfile,
        message: "Profile rejected"
      });
    }
  );

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT
  // ---------------------------------------------------------------------------

  // GET /admin/users
  // List all users
  app.get(
    "/users",
    { preHandler: authAndAdmin() },
    async (_request, reply) => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              handle: true,
              approvalStatus: true,
            },
          },
        },
      });

      return reply.status(200).send({ users });
    }
  );

  // GET /admin/users/:id
  // Get single user with full details
  app.get<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              projectsCreated: {
                orderBy: { createdAt: "desc" },
              },
              jobsPosted: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.status(200).send({ user });
    }
  );

  // POST /admin/users/:id/suspend
  // Suspend a user account
  app.post<{ Params: { id: string } }>(
    "/users/:id/suspend",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (user.status === "suspended") {
        return reply.status(400).send({ error: "User is already suspended" });
      }

      if (user.isAdmin) {
        return reply.status(400).send({ error: "Cannot suspend admin users" });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status: "suspended" },
      });

      return reply.status(200).send({
        user: updatedUser,
        message: "User suspended",
      });
    }
  );

  // POST /admin/users/:id/reinstate
  // Reinstate a suspended user
  app.post<{ Params: { id: string } }>(
    "/users/:id/reinstate",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (user.status !== "suspended") {
        return reply.status(400).send({ error: "User is not suspended" });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status: "approved" },
      });

      return reply.status(200).send({
        user: updatedUser,
        message: "User reinstated",
      });
    }
  );

  // ---------------------------------------------------------------------------
  // CONTENT MODERATION
  // ---------------------------------------------------------------------------

  // DELETE /admin/projects/:id
  // Remove a project (soft delete via archived status)
  app.delete<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Soft delete by setting status to archived
      await prisma.project.update({
        where: { id },
        data: { status: "archived" },
      });

      return reply.status(200).send({ message: "Project removed" });
    }
  );

  // DELETE /admin/jobs/:id
  // Remove a job (soft delete via active=false)
  app.delete<{ Params: { id: string } }>(
    "/jobs/:id",
    { preHandler: authAndAdmin() },
    async (request, reply) => {
      const { id } = request.params;

      const job = await prisma.job.findUnique({
        where: { id },
      });

      if (!job) {
        return reply.status(404).send({ error: "Job not found" });
      }

      // Soft delete by setting active to false
      await prisma.job.update({
        where: { id },
        data: { active: false },
      });

      return reply.status(200).send({ message: "Job removed" });
    }
  );

  // ---------------------------------------------------------------------------
  // SCHEDULED TASKS
  // ---------------------------------------------------------------------------

  // POST /admin/tasks/send-need-reminders
  // Send reminder emails to projects with stale needs (30+ days since last update)
  // Idempotent: won't re-send if reminder was sent within last 30 days
  app.post(
    "/tasks/send-need-reminders",
    { preHandler: authAndAdmin() },
    async (_request, reply) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find projects that need reminders:
      // - Have at least one need
      // - Most recent need update is 30+ days old
      // - Haven't received a reminder in the last 30 days (or never)
      // - Project is active
      // - Creator's profile is approved
      const projectsWithNeeds = await prisma.project.findMany({
        where: {
          status: "active",
          creator: {
            approvalStatus: "approved",
          },
          needs: {
            some: {}, // Has at least one need
          },
          OR: [
            { needsReminderSentAt: null },
            { needsReminderSentAt: { lte: thirtyDaysAgo } },
          ],
        },
        include: {
          creator: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          needs: {
            select: {
              updatedAt: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 1, // Only need the most recent update
          },
        },
      });

      // Filter to only projects where the most recent need update is 30+ days old
      const eligibleProjects = projectsWithNeeds.filter((project) => {
        if (project.needs.length === 0) return false;
        const mostRecentUpdate = project.needs[0].updatedAt;
        return mostRecentUpdate <= thirtyDaysAgo;
      });

      let sentCount = 0;
      let errorCount = 0;
      const results: { projectId: string; projectTitle: string; status: "sent" | "error"; error?: string }[] = [];

      for (const project of eligibleProjects) {
        try {
          await sendNeedReminderEmail({
            to: project.creator.user.email,
            profileName: project.creator.name,
            projectTitle: project.title,
            projectId: project.id,
          });

          // Only update timestamp after successful send
          await prisma.project.update({
            where: { id: project.id },
            data: { needsReminderSentAt: new Date() },
          });

          sentCount++;
          results.push({
            projectId: project.id,
            projectTitle: project.title,
            status: "sent",
          });
        } catch (error) {
          errorCount++;
          results.push({
            projectId: project.id,
            projectTitle: project.title,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return reply.status(200).send({
        message: `Sent ${sentCount} reminders, ${errorCount} errors`,
        totalEligible: eligibleProjects.length,
        sent: sentCount,
        errors: errorCount,
        results,
      });
    }
  );
}
