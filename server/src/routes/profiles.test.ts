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

describe("Profile Routes", () => {
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

  function stubApprovedSession() {
    const session = mockSession({ user: mockUser({ status: "approved" }) });
    prismaMock.session.findUnique.mockResolvedValue(session as never);
  }

  // =========================================================================
  // POST /api/profiles
  // =========================================================================
  describe("POST /api/profiles", () => {
    it("creates a draft profile", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique
        .mockResolvedValueOnce(null as never) // no existing profile
        .mockResolvedValueOnce(null as never); // handle not taken
      const createdProfile = mockProfile({
        approvalStatus: "draft",
        name: "New User",
        handle: "newuser",
      });
      prismaMock.profile.create.mockResolvedValue(createdProfile as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
        payload: {
          name: "New User",
          handle: "newuser",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().profile.handle).toBe("newuser");
      expect(prismaMock.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalStatus: "draft",
          }),
        })
      );
    });

    it("returns 409 when user already has a profile", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(mockProfile() as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
        payload: { name: "Test", handle: "testhandle" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Profile already exists");
    });

    it("returns 409 when handle is taken", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique
        .mockResolvedValueOnce(null as never) // no existing profile for user
        .mockResolvedValueOnce(mockProfile({ handle: "taken" }) as never); // handle taken

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
        payload: { name: "Test", handle: "taken" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Handle is already taken");
    });
  });

  // =========================================================================
  // GET /api/profiles/me
  // =========================================================================
  describe("GET /api/profiles/me", () => {
    it("returns own profile", async () => {
      stubApprovedSession();
      const profile = mockProfile();
      prismaMock.profile.findUnique.mockResolvedValue(profile as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/me",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().profile.id).toBe("profile-1");
    });

    it("returns 404 when no profile exists", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/me",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // PUT /api/profiles/me
  // =========================================================================
  describe("PUT /api/profiles/me", () => {
    it("allows minor edit on approved profile without re-approval", async () => {
      stubApprovedSession();
      const profile = mockProfile({ approvalStatus: "approved" });
      prismaMock.profile.findUnique.mockResolvedValue(profile as never);
      prismaMock.profile.update.mockResolvedValue({
        ...profile,
        bio: "Updated bio",
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me",
        headers: { cookie: authCookie() },
        payload: { bio: "Updated bio" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().requiresReapproval).toBe(false);
    });

    it("triggers re-approval on major edit (name change)", async () => {
      stubApprovedSession();
      const profile = mockProfile({ approvalStatus: "approved", name: "Old Name" });
      prismaMock.profile.findUnique.mockResolvedValue(profile as never);
      prismaMock.profile.update.mockResolvedValue({
        ...profile,
        name: "New Name",
        approvalStatus: "pending_review",
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me",
        headers: { cookie: authCookie() },
        payload: { name: "New Name" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().requiresReapproval).toBe(true);
    });

    it("returns 403 when profile is pending review", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "pending_review" }) as never
      );

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me",
        headers: { cookie: authCookie() },
        payload: { bio: "New bio" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toContain("pending review");
    });
  });

  // =========================================================================
  // POST /api/profiles/me/submit
  // =========================================================================
  describe("POST /api/profiles/me/submit", () => {
    it("transitions draft to pending_review", async () => {
      stubApprovedSession();
      const profile = mockProfile({ approvalStatus: "draft" });
      prismaMock.profile.findUnique.mockResolvedValue(profile as never);
      prismaMock.profile.update.mockResolvedValue({
        ...profile,
        approvalStatus: "pending_review",
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles/me/submit",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Profile submitted for review");
    });

    it("returns 400 when already pending review", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "pending_review" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles/me/submit",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when already approved", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "approved" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/profiles/me/submit",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // GET /api/profiles
  // =========================================================================
  describe("GET /api/profiles", () => {
    it("lists only approved profiles", async () => {
      stubApprovedSession();
      prismaMock.profile.findMany.mockResolvedValue([
        { id: "p1", name: "Approved User", handle: "approved", approvalStatus: "approved" },
      ] as never);
      prismaMock.profile.count.mockResolvedValue(1 as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().profiles).toHaveLength(1);
      // The route filters by approvalStatus: "approved" in the where clause
      expect(prismaMock.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { approvalStatus: "approved" },
        })
      );
    });
  });
});
