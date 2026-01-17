import type { FastifyRequest, FastifyReply } from "fastify";
import { getSessionIdFromRequest, getUserFromSession } from "../lib/session.js";

// =============================================================================
// AUTHORIZATION MIDDLEWARE
// =============================================================================

/**
 * requireAuth
 * Requires a valid session. Attaches user to request.
 * Returns 401 if not authenticated.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sessionId = getSessionIdFromRequest(request);

  if (!sessionId) {
    return reply.status(401).send({ error: "Authentication required" });
  }

  const user = await getUserFromSession(sessionId);

  if (!user) {
    return reply.status(401).send({ error: "Invalid or expired session" });
  }

  // Attach user to request for downstream handlers
  request.user = user;
}

/**
 * requireApproved
 * Requires user to have approved status.
 * Must be used after requireAuth.
 * Returns 403 if not approved.
 */
export async function requireApproved(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // First ensure user is authenticated
  if (!request.user) {
    await requireAuth(request, reply);
    if (reply.sent) return;
  }

  const user = request.user!;

  if (user.status === "suspended") {
    return reply.status(403).send({ error: "Account suspended" });
  }

  if (user.status === "pending") {
    return reply.status(403).send({ error: "Account pending approval" });
  }

  // status === "approved" - proceed
}

/**
 * requireEmployer
 * Requires user to have employer capability (active Stripe subscription).
 * Must be used after requireAuth.
 * Returns 403 if not an employer.
 */
export async function requireEmployer(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // First ensure user is authenticated and approved
  if (!request.user) {
    await requireAuth(request, reply);
    if (reply.sent) return;
  }

  await requireApproved(request, reply);
  if (reply.sent) return;

  const user = request.user!;

  if (!user.isEmployer) {
    return reply.status(403).send({ error: "Employer subscription required" });
  }
}

/**
 * requireAdmin
 * Requires user to have admin flag.
 * Must be used after requireAuth.
 * Returns 403 if not an admin.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // First ensure user is authenticated
  if (!request.user) {
    await requireAuth(request, reply);
    if (reply.sent) return;
  }

  const user = request.user!;

  if (!user.isAdmin) {
    return reply.status(403).send({ error: "Admin access required" });
  }
}

// =============================================================================
// COMPOSITE MIDDLEWARE FACTORIES
// =============================================================================

/**
 * Creates a preHandler array for routes that require authentication + approval.
 * Usage: { preHandler: authAndApproved() }
 */
export function authAndApproved() {
  return [requireAuth, requireApproved];
}

/**
 * Creates a preHandler array for routes that require employer access.
 * Usage: { preHandler: authAndEmployer() }
 */
export function authAndEmployer() {
  return [requireAuth, requireEmployer];
}

/**
 * Creates a preHandler array for routes that require admin access.
 * Usage: { preHandler: authAndAdmin() }
 */
export function authAndAdmin() {
  return [requireAuth, requireAdmin];
}
