import type { FastifyInstance } from "fastify";
import type { AuthUser } from "../types/index.js";

// Re-export mocks so test files can import from one place
export { prismaMock, resetPrismaMock } from "./mocks/prisma.js";
export { sendMagicLinkEmail, sendProfileApprovedEmail, sendProfileRejectedEmail, sendNeedReminderEmail, sendProfileSubmittedEmail } from "./mocks/email.js";
export { stripeMock } from "./mocks/stripe.js";

/**
 * Build a Fastify test app with rate limiting and static files disabled.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import("../app.js");
  return buildApp({
    enableRateLimit: false,
    enableStaticFiles: false,
    logger: false,
  });
}

/**
 * Factory: create a mock User record
 */
export function mockUser(overrides: Partial<{
  id: string;
  email: string;
  status: string;
  isEmployer: boolean;
  isAdmin: boolean;
  stripeCustomerId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "user-1",
    email: "test@example.com",
    status: "approved",
    isEmployer: false,
    isAdmin: false,
    stripeCustomerId: null,
    lastLoginAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

/**
 * Factory: create a mock Profile record
 */
export function mockProfile(overrides: Partial<{
  id: string;
  userId: string;
  name: string;
  handle: string;
  bio: string | null;
  location: string | null;
  portraitUrl: string | null;
  websiteUrl: string | null;
  twitterHandle: string | null;
  linkedinUrl: string | null;
  githubHandle: string | null;
  approvalStatus: string;
  approvedAt: Date | null;
  rejectionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "profile-1",
    userId: "user-1",
    name: "Test User",
    handle: "testuser",
    bio: null,
    location: null,
    portraitUrl: null,
    websiteUrl: null,
    twitterHandle: null,
    linkedinUrl: null,
    githubHandle: null,
    approvalStatus: "approved",
    approvedAt: new Date("2025-01-02"),
    rejectionNote: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

/**
 * Factory: create a mock Job record
 */
export function mockJob(overrides: Partial<{
  id: string;
  posterId: string;
  title: string;
  companyName: string;
  description: string | null;
  type: string;
  applyUrl: string;
  active: boolean;
  moderationStatus: string;
  reviewedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "job-1",
    posterId: "profile-1",
    title: "Senior Engineer",
    companyName: "Acme Co",
    description: null,
    type: "full_time",
    applyUrl: "https://example.com/apply",
    active: true,
    moderationStatus: "pending",
    reviewedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

/**
 * Factory: create a mock Session record with nested user
 */
export function mockSession(overrides: Partial<{
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user: ReturnType<typeof mockUser>;
}> = {}) {
  const user = overrides.user ?? mockUser();
  return {
    id: "session-1",
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date("2025-01-01"),
    user,
    ...overrides,
  };
}

/**
 * Build a cookie header string for authenticated requests.
 */
export function authCookie(sessionId = "session-1"): string {
  return `dmt_session=${sessionId}`;
}

/**
 * Factory: create a mock AuthUser (the shape attached to request.user)
 */
export function mockAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    email: "test@example.com",
    status: "approved",
    isEmployer: false,
    isAdmin: false,
    ...overrides,
  };
}
