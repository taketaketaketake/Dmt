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

  // =========================================================================
  // GET /api/profiles/me/skills
  // =========================================================================
  describe("GET /api/profiles/me/skills", () => {
    it("returns own skill tags", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue({
        id: "profile-1",
        skills: [
          {
            option: {
              id: "o1",
              name: "AI / ML expertise",
              slug: "ai-ml-expertise",
              category: { slug: "product-engineering" },
            },
          },
        ],
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().skills).toEqual([
        {
          id: "o1",
          name: "AI / ML expertise",
          slug: "ai-ml-expertise",
          categorySlug: "product-engineering",
        },
      ]);
    });

    it("returns 404 when no profile exists", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // PUT /api/profiles/me/skills
  // =========================================================================
  describe("PUT /api/profiles/me/skills", () => {
    it("rejects a non-array body", async () => {
      stubApprovedSession();

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
        payload: { optionIds: "not-an-array" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("must be an array");
    });

    it("rejects more than the maximum number of skills", async () => {
      stubApprovedSession();
      const tooMany = Array.from({ length: 11 }, (_, i) => `o${i}`);

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
        payload: { optionIds: tooMany },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Maximum");
    });

    it("rejects options that are not offerable or do not exist", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1" } as never);
      // Only 1 of the 2 requested ids is valid+offerable
      prismaMock.needOption.count.mockResolvedValue(1 as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
        payload: { optionIds: ["o1", "not-offerable"] },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("invalid");
    });

    it("saves a valid, de-duplicated selection", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1" } as never);
      prismaMock.needOption.count.mockResolvedValue(1 as never);
      prismaMock.$transaction.mockImplementation(
        async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)
      );
      prismaMock.profileSkill.deleteMany.mockResolvedValue({ count: 0 } as never);
      prismaMock.profileSkill.createMany.mockResolvedValue({ count: 1 } as never);
      prismaMock.profileSkill.findMany.mockResolvedValue([
        {
          option: {
            id: "o1",
            name: "AI / ML expertise",
            slug: "ai-ml-expertise",
            category: { slug: "product-engineering" },
          },
        },
      ] as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/profiles/me/skills",
        headers: { cookie: authCookie() },
        // Duplicate id should be collapsed to a single skill
        payload: { optionIds: ["o1", "o1"] },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().skills).toHaveLength(1);
      // De-duplicated to a single create
      expect(prismaMock.profileSkill.createMany).toHaveBeenCalledWith({
        data: [{ profileId: "profile-1", optionId: "o1" }],
      });
    });
  });

  // =========================================================================
  // GET /api/profiles/:handle/matching-projects
  // =========================================================================
  describe("GET /api/profiles/:handle/matching-projects", () => {
    it("returns active projects whose needs overlap the person's skills", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue({
        approvalStatus: "approved",
        skills: [{ optionId: "o1" }],
      } as never);
      prismaMock.project.findMany.mockResolvedValue([
        {
          id: "proj-1",
          title: "Cool Project",
          description: "desc",
          status: "active",
          creator: { id: "c1", name: "Creator", handle: "creator", portraitUrl: null },
          needs: [
            { options: [{ option: { id: "o1", name: "AI / ML expertise", slug: "ai-ml-expertise" } }] },
          ],
        },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/someone/matching-projects",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const { projects } = response.json();
      expect(projects).toHaveLength(1);
      expect(projects[0].matchedSkills).toEqual([
        { id: "o1", name: "AI / ML expertise", slug: "ai-ml-expertise" },
      ]);
    });

    it("returns an empty list when the person has no skills", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue({
        approvalStatus: "approved",
        skills: [],
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/profiles/someone/matching-projects",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().projects).toEqual([]);
      expect(prismaMock.project.findMany).not.toHaveBeenCalled();
    });
  });
});
