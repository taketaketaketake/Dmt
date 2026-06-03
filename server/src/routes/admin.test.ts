import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  mockUser,
  mockProfile,
  mockJob,
  mockSession,
  authCookie,
  sendProfileApprovedEmail,
  sendProfileRejectedEmail,
} from "../test/helpers.js";

describe("Admin Routes", () => {
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
    sendProfileApprovedEmail.mockClear();
    sendProfileRejectedEmail.mockClear();
  });

  function stubAdminSession() {
    const session = mockSession({
      user: mockUser({ isAdmin: true }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
  }

  function stubNonAdminSession() {
    const session = mockSession({
      user: mockUser({ isAdmin: false }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
  }

  // =========================================================================
  // Auth guards on all admin routes
  // =========================================================================
  describe("auth guards", () => {
    const adminRoutes = [
      { method: "GET" as const, url: "/api/admin/profiles/pending" },
      { method: "POST" as const, url: "/api/admin/profiles/some-id/approve" },
      { method: "POST" as const, url: "/api/admin/profiles/some-id/reject" },
      { method: "POST" as const, url: "/api/admin/users/some-id/suspend" },
      { method: "POST" as const, url: "/api/admin/users/some-id/reinstate" },
      { method: "GET" as const, url: "/api/admin/jobs/pending" },
      { method: "POST" as const, url: "/api/admin/jobs/some-id/approve" },
      { method: "POST" as const, url: "/api/admin/jobs/some-id/reject" },
      { method: "GET" as const, url: "/api/admin/stats" },
    ];

    for (const route of adminRoutes) {
      it(`${route.method} ${route.url} returns 401 without auth`, async () => {
        const response = await app.inject({
          method: route.method,
          url: route.url,
        });
        expect(response.statusCode).toBe(401);
      });

      it(`${route.method} ${route.url} returns 403 for non-admin`, async () => {
        stubNonAdminSession();

        const response = await app.inject({
          method: route.method,
          url: route.url,
          headers: { cookie: authCookie() },
        });
        expect(response.statusCode).toBe(403);
      });
    }
  });

  // =========================================================================
  // POST /api/admin/profiles/:id/approve
  // =========================================================================
  describe("POST /api/admin/profiles/:id/approve", () => {
    it("returns 404 when profile not found", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/nonexistent/approve",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when profile is not pending_review", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({
          approvalStatus: "draft",
          userId: "user-2",
        }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/profile-1/approve",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Cannot approve profile with status");
    });

    it("approves profile and user, sends email", async () => {
      stubAdminSession();
      const profile = mockProfile({
        approvalStatus: "pending_review",
        userId: "user-2",
      });
      prismaMock.profile.findUnique.mockResolvedValue({
        ...profile,
        user: { id: "user-2", email: "member@example.com", status: "pending" },
      } as never);
      prismaMock.$transaction.mockResolvedValue([
        { ...profile, approvalStatus: "approved" },
        {},
      ] as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/profile-1/approve",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Profile approved");
      expect(sendProfileApprovedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "member@example.com",
          profileName: profile.name,
        })
      );
    });
  });

  // =========================================================================
  // POST /api/admin/profiles/:id/reject
  // =========================================================================
  describe("POST /api/admin/profiles/:id/reject", () => {
    it("returns 404 when profile not found", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/nonexistent/reject",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when profile is not pending_review", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/profile-1/reject",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects profile with note and sends email", async () => {
      stubAdminSession();
      const profile = mockProfile({
        approvalStatus: "pending_review",
        userId: "user-2",
      });
      prismaMock.profile.findUnique.mockResolvedValue({
        ...profile,
        user: { id: "user-2", email: "member@example.com" },
      } as never);
      prismaMock.profile.update.mockResolvedValue({
        ...profile,
        approvalStatus: "rejected",
        rejectionNote: "Please add a photo",
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/profiles/profile-1/reject",
        headers: { cookie: authCookie() },
        payload: { note: "Please add a photo" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Profile rejected");
      expect(sendProfileRejectedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "member@example.com",
          rejectionNote: "Please add a photo",
        })
      );
    });
  });

  // =========================================================================
  // POST /api/admin/users/:id/suspend
  // =========================================================================
  describe("POST /api/admin/users/:id/suspend", () => {
    it("returns 400 when user is already suspended", async () => {
      stubAdminSession();
      prismaMock.user.findUnique.mockResolvedValue(
        mockUser({ id: "user-2", status: "suspended" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/users/user-2/suspend",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("User is already suspended");
    });

    it("returns 400 when target is admin", async () => {
      stubAdminSession();
      prismaMock.user.findUnique.mockResolvedValue(
        mockUser({ id: "user-2", isAdmin: true }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/users/user-2/suspend",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Cannot suspend admin users");
    });

    it("suspends user successfully", async () => {
      stubAdminSession();
      const user = mockUser({ id: "user-2", status: "approved" });
      prismaMock.user.findUnique.mockResolvedValue(user as never);
      prismaMock.user.update.mockResolvedValue({ ...user, status: "suspended" } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/users/user-2/suspend",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("User suspended");
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { status: "suspended" },
      });
    });
  });

  // =========================================================================
  // POST /api/admin/users/:id/reinstate
  // =========================================================================
  describe("POST /api/admin/users/:id/reinstate", () => {
    it("returns 400 when user is not suspended", async () => {
      stubAdminSession();
      prismaMock.user.findUnique.mockResolvedValue(
        mockUser({ id: "user-2", status: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/users/user-2/reinstate",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("User is not suspended");
    });

    it("reinstates user successfully", async () => {
      stubAdminSession();
      const user = mockUser({ id: "user-2", status: "suspended" });
      prismaMock.user.findUnique.mockResolvedValue(user as never);
      prismaMock.user.update.mockResolvedValue({ ...user, status: "approved" } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/users/user-2/reinstate",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("User reinstated");
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { status: "approved" },
      });
    });
  });

  // =========================================================================
  // GET /api/admin/jobs/pending
  // =========================================================================
  describe("GET /api/admin/jobs/pending", () => {
    it("returns live jobs awaiting review with pagination", async () => {
      stubAdminSession();
      const job = mockJob({ moderationStatus: "pending" });
      prismaMock.job.findMany.mockResolvedValue([job] as never);
      prismaMock.job.count.mockResolvedValue(1 as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/jobs/pending",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.jobs).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
      // Only pending + active jobs should be queried
      expect(prismaMock.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { moderationStatus: "pending", active: true },
        })
      );
    });
  });

  // =========================================================================
  // POST /api/admin/jobs/:id/approve
  // =========================================================================
  describe("POST /api/admin/jobs/:id/approve", () => {
    it("returns 404 when job not found", async () => {
      stubAdminSession();
      prismaMock.job.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/jobs/nonexistent/approve",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when job is not pending", async () => {
      stubAdminSession();
      prismaMock.job.findUnique.mockResolvedValue(
        mockJob({ moderationStatus: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/jobs/job-1/approve",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Cannot approve job with status");
    });

    it("approves a pending job and keeps it live", async () => {
      stubAdminSession();
      const job = mockJob({ moderationStatus: "pending" });
      prismaMock.job.findUnique.mockResolvedValue(job as never);
      prismaMock.job.update.mockResolvedValue(
        { ...job, moderationStatus: "approved" } as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/jobs/job-1/approve",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Job approved");
      expect(prismaMock.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({ moderationStatus: "approved" }),
        })
      );
    });
  });

  // =========================================================================
  // POST /api/admin/jobs/:id/reject
  // =========================================================================
  describe("POST /api/admin/jobs/:id/reject", () => {
    it("returns 400 when job is not pending", async () => {
      stubAdminSession();
      prismaMock.job.findUnique.mockResolvedValue(
        mockJob({ moderationStatus: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/jobs/job-1/reject",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects a pending job and takes it down (active=false)", async () => {
      stubAdminSession();
      const job = mockJob({ moderationStatus: "pending" });
      prismaMock.job.findUnique.mockResolvedValue(job as never);
      prismaMock.job.update.mockResolvedValue(
        { ...job, moderationStatus: "rejected", active: false } as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/jobs/job-1/reject",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Job rejected");
      expect(prismaMock.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            moderationStatus: "rejected",
            active: false,
          }),
        })
      );
    });
  });

  // =========================================================================
  // GET /api/admin/stats
  // =========================================================================
  describe("GET /api/admin/stats", () => {
    it("returns pending profile and job counts", async () => {
      stubAdminSession();
      prismaMock.profile.count.mockResolvedValue(3 as never);
      prismaMock.job.count.mockResolvedValue(2 as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/stats",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ pendingProfiles: 3, pendingJobs: 2 });
    });
  });
});
