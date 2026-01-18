import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { sendMagicLinkEmail } from "../lib/resend.js";
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionIdFromRequest,
  getUserFromSession,
} from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

interface LoginBody {
  email: string;
}

interface VerifyQuery {
  token: string;
}

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  // Request a magic link email
  // Stricter rate limit: 5 requests per minute per IP to prevent abuse
  app.post<{ Body: LoginBody }>("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const { email } = request.body;

    if (!email || typeof email !== "string") {
      return reply.status(400).send({ error: "Email is required" });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Basic email validation
    if (!normalizedEmail.includes("@") || normalizedEmail.length < 5) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // New user - create with pending status
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          status: "pending",
        },
      });
    }

    // Create magic link token
    const token = await createMagicLinkToken(user.id);

    // Build magic link URL
    const magicLinkUrl = `${env.APP_URL}/auth/verify?token=${token}`;

    // Send email
    await sendMagicLinkEmail({
      to: normalizedEmail,
      magicLinkUrl,
    });

    return reply.status(200).send({
      message: "Magic link sent",
      // In dev, include the token for testing
      ...(env.isDev && { token }),
    });
  });

  // GET /auth/verify
  // Verify magic link token and create session
  app.get<{ Querystring: VerifyQuery }>("/verify", async (request, reply) => {
    const { token } = request.query;

    if (!token || typeof token !== "string") {
      return reply.status(400).send({ error: "Token is required" });
    }

    const sessionId = await verifyMagicLinkToken(token);

    if (!sessionId) {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    // Set session cookie
    setSessionCookie(reply, sessionId);

    // Redirect to app (frontend will handle the rest)
    return reply.redirect(`${env.APP_URL}/`);
  });

  // POST /auth/logout
  // Clear session and cookie
  app.post("/logout", async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);

    if (sessionId) {
      await deleteSession(sessionId);
    }

    clearSessionCookie(reply);

    return reply.status(200).send({ message: "Logged out" });
  });

  // GET /me
  // Get current authenticated user
  app.get(
    "/me",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      // Fetch profile if it exists
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });

      return reply.status(200).send({
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          isEmployer: user.isEmployer,
          isAdmin: user.isAdmin,
        },
        profile: profile
          ? {
              id: profile.id,
              name: profile.name,
              handle: profile.handle,
              bio: profile.bio,
              location: profile.location,
              portraitUrl: profile.portraitUrl,
              approvalStatus: profile.approvalStatus,
            }
          : null,
      });
    }
  );
}
