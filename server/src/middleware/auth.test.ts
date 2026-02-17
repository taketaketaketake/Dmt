import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  mockSession,
  mockUser,
  authCookie,
} from "../test/helpers.js";

describe("Auth Middleware", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetPrismaMock();
  });

  // Helper: set up a valid session mock
  function stubValidSession(overrides: Parameters<typeof mockUser>[0] = {}) {
    const session = mockSession({ user: mockUser(overrides) });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
    // For auth/me to also succeed, stub profile lookup
    prismaMock.profile.findUnique.mockResolvedValue(null as never);
  }

  describe("requireAuth", () => {
    it("returns 401 when no session cookie is sent", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Authentication required");
    });

    it("returns 401 for expired session", async () => {
      const session = mockSession({
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      prismaMock.session.findUnique.mockResolvedValue(session as never);
      prismaMock.session.delete.mockResolvedValue(session as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for nonexistent session", async () => {
      prismaMock.session.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns 200 with valid session", async () => {
      stubValidSession();

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().user).toBeDefined();
    });
  });

  describe("requireApproved", () => {
    it("returns 403 for suspended user", async () => {
      stubValidSession({ status: "suspended" });

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Account suspended");
    });

    it("returns 403 for pending user", async () => {
      stubValidSession({ status: "pending" });

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Account pending approval");
    });

    it("returns 200 for approved user", async () => {
      stubValidSession({ status: "approved" });
      prismaMock.profile.findMany.mockResolvedValue([] as never);
      prismaMock.profile.count.mockResolvedValue(0 as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("requireEmployer", () => {
    it("returns 403 for non-employer user", async () => {
      stubValidSession({ status: "approved", isEmployer: false });

      const response = await app.inject({
        method: "POST",
        url: "/api/jobs",
        headers: { cookie: authCookie() },
        payload: {
          title: "Test Job",
          companyName: "Test Co",
          type: "full_time",
          applyUrl: "https://example.com/apply",
        },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Employer subscription required");
    });

    it("returns success for employer user", async () => {
      stubValidSession({ status: "approved", isEmployer: true });
      prismaMock.profile.findUnique.mockResolvedValue({
        id: "profile-1",
        userId: "user-1",
        approvalStatus: "approved",
      } as never);
      prismaMock.job.create.mockResolvedValue({
        id: "job-1",
        title: "Test Job",
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/jobs",
        headers: { cookie: authCookie() },
        payload: {
          title: "Test Job",
          companyName: "Test Co",
          type: "full_time",
          applyUrl: "https://example.com/apply",
        },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe("requireAdmin", () => {
    it("returns 403 for non-admin user", async () => {
      stubValidSession({ isAdmin: false });

      const response = await app.inject({
        method: "GET",
        url: "/admin/profiles/pending",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Admin access required");
    });

    it("returns 200 for admin user", async () => {
      stubValidSession({ isAdmin: true });
      prismaMock.profile.findMany.mockResolvedValue([] as never);
      prismaMock.profile.count.mockResolvedValue(0 as never);

      const response = await app.inject({
        method: "GET",
        url: "/admin/profiles/pending",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
