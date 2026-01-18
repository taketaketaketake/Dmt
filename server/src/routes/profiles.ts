import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, authAndApproved } from "../middleware/auth.js";
import { sanitizeProfileInput } from "../lib/sanitize.js";
import { parsePagination, paginationMeta } from "../lib/pagination.js";

// =============================================================================
// TYPES
// =============================================================================

interface CreateProfileBody {
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
}

interface UpdateProfileBody {
  name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
}

interface ProfileParams {
  handle: string;
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
}

// =============================================================================
// HELPER: Validate handle format
// =============================================================================

function isValidHandle(handle: string): boolean {
  // Lowercase letters, numbers, underscores. 3-30 chars.
  return /^[a-z0-9_]{3,30}$/.test(handle);
}

// =============================================================================
// HELPER: Categorize profile fields
// Minor edits = no re-approval needed for approved profiles
// Major edits = triggers re-approval for approved profiles
// =============================================================================

const MINOR_FIELDS = ["bio", "location", "websiteUrl", "twitterHandle", "githubHandle", "linkedinUrl"] as const;
const MAJOR_FIELDS = ["name", "handle", "portraitUrl"] as const;

function hasMajorChanges(body: UpdateProfileBody, currentProfile: { name: string; handle: string; portraitUrl: string | null }): boolean {
  if (body.name !== undefined && body.name.trim() !== currentProfile.name) return true;
  if (body.handle !== undefined && body.handle.toLowerCase().trim() !== currentProfile.handle) return true;
  if (body.portraitUrl !== undefined && body.portraitUrl !== currentProfile.portraitUrl) return true;
  return false;
}

// =============================================================================
// PROFILE ROUTES
// =============================================================================

export async function profileRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // POST /api/profiles
  // Create profile draft (authenticated user, no existing profile)
  // ---------------------------------------------------------------------------
  app.post<{ Body: CreateProfileBody }>(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;

      // Check if user already has a profile
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (existingProfile) {
        return reply.status(409).send({ error: "Profile already exists" });
      }

      // Sanitize all input through centralized sanitizer
      const sanitized = sanitizeProfileInput(request.body);

      // Validate required fields
      if (!sanitized.name) {
        return reply.status(400).send({ error: "Name is required" });
      }

      if (!sanitized.handle) {
        return reply.status(400).send({ error: "Handle is required (3-30 chars, lowercase alphanumeric)" });
      }

      if (!isValidHandle(sanitized.handle)) {
        return reply.status(400).send({
          error: "Handle must be 3-30 characters, lowercase letters, numbers, and underscores only"
        });
      }

      // Check handle uniqueness
      const handleTaken = await prisma.profile.findUnique({
        where: { handle: sanitized.handle },
      });

      if (handleTaken) {
        return reply.status(409).send({ error: "Handle is already taken" });
      }

      // Create profile in draft status
      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          name: sanitized.name,
          handle: sanitized.handle,
          bio: sanitized.bio,
          location: sanitized.location,
          portraitUrl: sanitized.portraitUrl,
          websiteUrl: sanitized.websiteUrl,
          twitterHandle: sanitized.twitterHandle,
          linkedinUrl: sanitized.linkedinUrl,
          githubHandle: sanitized.githubHandle,
          approvalStatus: "draft",
        },
      });

      return reply.status(201).send({ profile });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/profiles/me
  // Get own profile (authenticated user)
  // ---------------------------------------------------------------------------
  app.get(
    "/me",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      return reply.status(200).send({ profile });
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/profiles/me
  // Update own profile (authenticated user)
  // - Draft/Rejected: Can edit freely
  // - Pending Review: Cannot edit
  // - Approved: Minor edits allowed, major edits trigger re-approval
  // ---------------------------------------------------------------------------
  app.put<{ Body: UpdateProfileBody }>(
    "/me",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      // Cannot edit while pending review
      if (profile.approvalStatus === "pending_review") {
        return reply.status(403).send({
          error: "Cannot edit profile while pending review"
        });
      }

      // Sanitize all input through centralized sanitizer
      const sanitized = sanitizeProfileInput(request.body);

      // Check if this is an approved profile making major changes
      const isApproved = profile.approvalStatus === "approved";
      const majorChanges = isApproved && hasMajorChanges(request.body, profile);

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (sanitized.name !== undefined) {
        if (!sanitized.name) {
          return reply.status(400).send({ error: "Name cannot be empty" });
        }
        updateData.name = sanitized.name;
      }

      if (sanitized.handle !== undefined) {
        if (!sanitized.handle || !isValidHandle(sanitized.handle)) {
          return reply.status(400).send({
            error: "Handle must be 3-30 characters, lowercase letters, numbers, and underscores only"
          });
        }

        // Check uniqueness only if handle is changing
        if (sanitized.handle !== profile.handle) {
          const handleTaken = await prisma.profile.findUnique({
            where: { handle: sanitized.handle },
          });

          if (handleTaken) {
            return reply.status(409).send({ error: "Handle is already taken" });
          }
        }

        updateData.handle = sanitized.handle;
      }

      // Apply remaining sanitized fields
      if (sanitized.bio !== undefined) updateData.bio = sanitized.bio;
      if (sanitized.location !== undefined) updateData.location = sanitized.location;
      if (sanitized.portraitUrl !== undefined) updateData.portraitUrl = sanitized.portraitUrl;
      if (sanitized.websiteUrl !== undefined) updateData.websiteUrl = sanitized.websiteUrl;
      if (sanitized.twitterHandle !== undefined) updateData.twitterHandle = sanitized.twitterHandle;
      if (sanitized.linkedinUrl !== undefined) updateData.linkedinUrl = sanitized.linkedinUrl;
      if (sanitized.githubHandle !== undefined) updateData.githubHandle = sanitized.githubHandle;

      // Handle status changes based on current status and edit type
      if (profile.approvalStatus === "rejected") {
        // Clear rejection note on edit (they're addressing feedback)
        updateData.rejectionNote = null;
      } else if (majorChanges) {
        // Approved profile with major changes -> requires re-approval
        updateData.approvalStatus = "pending_review";
        updateData.approvedAt = null;
      }
      // Minor edits to approved profile: keep approved status

      const updatedProfile = await prisma.profile.update({
        where: { id: profile.id },
        data: updateData,
      });

      return reply.status(200).send({
        profile: updatedProfile,
        // Let frontend know if re-approval is needed
        requiresReapproval: majorChanges,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // POST /api/profiles/me/submit
  // Submit profile for review
  // Transitions: draft -> pending_review, rejected -> pending_review
  // ---------------------------------------------------------------------------
  app.post(
    "/me/submit",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      // Can only submit from draft or rejected status
      if (profile.approvalStatus === "pending_review") {
        return reply.status(400).send({ error: "Profile is already pending review" });
      }

      if (profile.approvalStatus === "approved") {
        return reply.status(400).send({ error: "Profile is already approved" });
      }

      const updatedProfile = await prisma.profile.update({
        where: { id: profile.id },
        data: {
          approvalStatus: "pending_review",
          rejectionNote: null, // Clear any previous rejection note
        },
      });

      return reply.status(200).send({
        profile: updatedProfile,
        message: "Profile submitted for review"
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/profiles
  // List approved profiles (members only)
  // Supports pagination: ?limit=20&offset=0
  // TODO: Phase 3 - Add category filtering
  // TODO: Phase 3 - Add search
  // ---------------------------------------------------------------------------
  app.get<{ Querystring: PaginationQuery }>(
    "/",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const { limit, offset } = parsePagination(request.query);

      const [profiles, total] = await Promise.all([
        prisma.profile.findMany({
          where: {
            approvalStatus: "approved",
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            handle: true,
            bio: true,
            location: true,
            portraitUrl: true,
            // Don't expose external links in list view
          },
          take: limit,
          skip: offset,
        }),
        prisma.profile.count({
          where: {
            approvalStatus: "approved",
          },
        }),
      ]);

      return reply.status(200).send({
        profiles,
        pagination: paginationMeta(total, limit, offset),
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/profiles/:handle
  // Get single profile by handle
  // - Members can view approved profiles
  // - Owners can view their own profile (any status)
  // - Admins can view any profile
  // ---------------------------------------------------------------------------
  app.get<{ Params: ProfileParams }>(
    "/:handle",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const { handle } = request.params;

      const profile = await prisma.profile.findUnique({
        where: { handle: handle.toLowerCase() },
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

      // Check access
      const isOwner = profile.userId === user.id;
      const isAdmin = user.isAdmin;
      const isApproved = profile.approvalStatus === "approved";
      const userIsApprovedMember = user.status === "approved";

      // Owners and admins can always view
      if (isOwner || isAdmin) {
        return reply.status(200).send({ profile });
      }

      // Members can only view approved profiles
      if (!userIsApprovedMember) {
        return reply.status(403).send({ error: "Account pending approval" });
      }

      if (!isApproved) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      // Return approved profile without sensitive data
      const { user: _, ...profileData } = profile;
      return reply.status(200).send({ profile: profileData });
    }
  );
}
