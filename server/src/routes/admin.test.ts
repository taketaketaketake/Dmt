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
      { method: "GET" as const, url: "/admin/profiles/pending" },
      { method: "POST" as const, url: "/admin/profiles/some-id/approve" },
      { method: "POST" as const, url: "/admin/profiles/some-id/reject" },
      { method: "POST" as const, url: "/admin/users/some-id/suspend" },
      { method: "POST" as const, url: "/admin/users/some-id/reinstate" },
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
  // POST /admin/profiles/:id/approve
  // =========================================================================
  describe("POST /admin/profiles/:id/approve", () => {
    it("returns 404 when profile not found", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/admin/profiles/nonexistent/approve",
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
        url: "/admin/profiles/profile-1/approve",
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
        url: "/admin/profiles/profile-1/approve",
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
  // POST /admin/profiles/:id/reject
  // =========================================================================
  describe("POST /admin/profiles/:id/reject", () => {
    it("returns 404 when profile not found", async () => {
      stubAdminSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/admin/profiles/nonexistent/reject",
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
        url: "/admin/profiles/profile-1/reject",
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
        url: "/admin/profiles/profile-1/reject",
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
  // POST /admin/users/:id/suspend
  // =========================================================================
  describe("POST /admin/users/:id/suspend", () => {
    it("returns 400 when user is already suspended", async () => {
      stubAdminSession();
      prismaMock.user.findUnique.mockResolvedValue(
        mockUser({ id: "user-2", status: "suspended" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/admin/users/user-2/suspend",
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
        url: "/admin/users/user-2/suspend",
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
        url: "/admin/users/user-2/suspend",
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
  // POST /admin/users/:id/reinstate
  // =========================================================================
  describe("POST /admin/users/:id/reinstate", () => {
    it("returns 400 when user is not suspended", async () => {
      stubAdminSession();
      prismaMock.user.findUnique.mockResolvedValue(
        mockUser({ id: "user-2", status: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/admin/users/user-2/reinstate",
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
        url: "/admin/users/user-2/reinstate",
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
});
