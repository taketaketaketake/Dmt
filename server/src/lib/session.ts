import { nanoid } from "nanoid";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "../types/index.js";

const SESSION_COOKIE_NAME = "dmt_session";

// Session expiry in milliseconds
function getSessionExpiry(): Date {
  const days = env.SESSION_MAX_AGE_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Magic link token expiry in milliseconds
function getMagicLinkExpiry(): Date {
  const minutes = env.MAGIC_LINK_EXPIRY_MINUTES;
  return new Date(Date.now() + minutes * 60 * 1000);
}

// Create a magic link token for a user
export async function createMagicLinkToken(userId: string): Promise<string> {
  const token = nanoid(32);

  await prisma.magicLinkToken.create({
    data: {
      token,
      userId,
      expiresAt: getMagicLinkExpiry(),
    },
  });

  return token;
}

// Verify a magic link token and create a session
// Returns the session ID on success, null if invalid/expired
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!magicLink) {
    return null;
  }

  if (magicLink.used) {
    return null;
  }

  if (magicLink.expiresAt < new Date()) {
    return null;
  }

  // Mark token as used
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { used: true },
  });

  // Update user's last login time
  await prisma.user.update({
    where: { id: magicLink.userId },
    data: { lastLoginAt: new Date() },
  });

  // Create session
  const sessionId = nanoid(32);
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: magicLink.userId,
      expiresAt: getSessionExpiry(),
    },
  });

  return sessionId;
}

// Get user from session ID
export async function getUserFromSession(sessionId: string): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  // Sliding expiry: refresh if less than half the max age remains
  const halfLife = (env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) / 2;
  const timeRemaining = session.expiresAt.getTime() - Date.now();
  if (timeRemaining < halfLife) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: getSessionExpiry() },
    });
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    isEmployer: user.isEmployer,
    isAdmin: user.isAdmin,
  };
}

// Delete a session (logout)
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
    // Ignore if session doesn't exist
  });
}

// Set session cookie on response
export function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60, // seconds
  });
}

// Clear session cookie on response
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
  });
}

// Get session ID from request cookies
export function getSessionIdFromRequest(request: FastifyRequest): string | undefined {
  return request.cookies[SESSION_COOKIE_NAME];
}
