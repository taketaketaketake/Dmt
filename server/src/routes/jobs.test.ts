import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  mockUser,
  mockProfile,
  mockSession,
  authCookie,
} from "../test/helpers.js";

describe("Job Routes", () => {
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

  function stubEmployerSession() {
    const session = mockSession({
      user: mockUser({ status: "approved", isEmployer: true }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
  }

  function stubApprovedSession() {
    const session = mockSession({ user: mockUser({ status: "approved" }) });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
  }

  // =========================================================================
  // POST /api/jobs
  // =========================================================================
  describe("POST /api/jobs", () => {
    it("returns 403 when user is not an employer", async () => {
      stubApprovedSession();

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

    it("creates a job for employer with approved profile", async () => {
      stubEmployerSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "approved" }) as never
      );
      prismaMock.job.create.mockResolvedValue({
        id: "job-1",
        title: "Engineer",
        companyName: "Test Co",
        type: "full_time",
        applyUrl: "https://example.com/apply",
        active: true,
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/jobs",
        headers: { cookie: authCookie() },
        payload: {
          title: "Engineer",
          companyName: "Test Co",
          type: "full_time",
          applyUrl: "https://example.com/apply",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().job.title).toBe("Engineer");
    });

    it("rejects past expiry date", async () => {
      stubEmployerSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/jobs",
        headers: { cookie: authCookie() },
        payload: {
          title: "Job",
          companyName: "Co",
          type: "full_time",
          applyUrl: "https://example.com",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("future");
    });
  });

  // =========================================================================
  // GET /api/jobs
  // =========================================================================
  describe("GET /api/jobs", () => {
    it("lists only active, non-expired jobs from approved profiles", async () => {
      stubApprovedSession();
      prismaMock.job.findMany.mockResolvedValue([
        {
          id: "job-1",
          title: "Active Job",
          active: true,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ] as never);
      prismaMock.job.count.mockResolvedValue(1 as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/jobs",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().jobs).toHaveLength(1);
      // Verify the where clause includes proper filters
      expect(prismaMock.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
            poster: { approvalStatus: "approved" },
          }),
        })
      );
    });
  });

  // =========================================================================
  // PUT /api/jobs/:id
  // =========================================================================
  describe("PUT /api/jobs/:id", () => {
    it("allows owner to update", async () => {
      stubApprovedSession();
      prismaMock.job.findUnique.mockResolvedValue({
        id: "job-1",
        poster: { userId: "user-1" },
      } as never);
      prismaMock.job.update.mockResolvedValue({
        id: "job-1",
        title: "Updated Title",
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/jobs/job-1",
        headers: { cookie: authCookie() },
        payload: { title: "Updated Title" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("rejects non-owner update", async () => {
      stubApprovedSession();
      prismaMock.job.findUnique.mockResolvedValue({
        id: "job-1",
        poster: { userId: "other-user" },
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/jobs/job-1",
        headers: { cookie: authCookie() },
        payload: { title: "Hacked" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // DELETE /api/jobs/:id
  // =========================================================================
  describe("DELETE /api/jobs/:id", () => {
    it("allows owner to delete", async () => {
      stubApprovedSession();
      prismaMock.job.findUnique.mockResolvedValue({
        id: "job-1",
        poster: { userId: "user-1" },
      } as never);
      prismaMock.job.delete.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/jobs/job-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Job deleted");
    });

    it("allows admin to delete", async () => {
      const session = mockSession({ user: mockUser({ isAdmin: true }) });
      prismaMock.session.findUnique.mockResolvedValue(session as never);
      prismaMock.job.findUnique.mockResolvedValue({
        id: "job-1",
        poster: { userId: "other-user" },
      } as never);
      prismaMock.job.delete.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/jobs/job-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
    });

    it("rejects non-owner non-admin delete", async () => {
      stubApprovedSession();
      prismaMock.job.findUnique.mockResolvedValue({
        id: "job-1",
        poster: { userId: "other-user" },
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/jobs/job-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
