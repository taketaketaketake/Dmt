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

describe("Project Routes", () => {
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
  // POST /api/projects
  // =========================================================================
  describe("POST /api/projects", () => {
    it("requires an approved profile", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: { cookie: authCookie() },
        payload: { title: "My Project" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Profile required");
    });

    it("rejects if profile is not approved", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "draft" }) as never
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: { cookie: authCookie() },
        payload: { title: "My Project" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("creates a project successfully", async () => {
      stubApprovedSession();
      prismaMock.profile.findUnique.mockResolvedValue(
        mockProfile({ approvalStatus: "approved" }) as never
      );
      prismaMock.project.create.mockResolvedValue({
        id: "proj-1",
        title: "My Project",
        status: "active",
        creatorId: "profile-1",
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: { cookie: authCookie() },
        payload: { title: "My Project" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().project.title).toBe("My Project");
    });
  });

  // =========================================================================
  // PUT /api/projects/:id
  // =========================================================================
  describe("PUT /api/projects/:id", () => {
    it("allows owner to update", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        title: "Old Title",
        creator: { userId: "user-1" },
      } as never);
      prismaMock.project.update.mockResolvedValue({
        id: "proj-1",
        title: "New Title",
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1",
        headers: { cookie: authCookie() },
        payload: { title: "New Title" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("rejects non-owner update", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        creator: { userId: "other-user" },
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1",
        headers: { cookie: authCookie() },
        payload: { title: "Hacked Title" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // PUT /api/projects/:id/needs
  // =========================================================================
  describe("PUT /api/projects/:id/needs", () => {
    function stubProjectOwnership() {
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        creator: { userId: "user-1" },
      } as never);
    }

    it("rejects more than 3 categories", async () => {
      stubApprovedSession();
      stubProjectOwnership();

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1/needs",
        headers: { cookie: authCookie() },
        payload: {
          needs: [
            { categoryId: "c1", optionIds: ["o1"] },
            { categoryId: "c2", optionIds: ["o2"] },
            { categoryId: "c3", optionIds: ["o3"] },
            { categoryId: "c4", optionIds: ["o4"] },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Maximum 3 need categories");
    });

    it("rejects more than 2 options per category", async () => {
      stubApprovedSession();
      stubProjectOwnership();

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1/needs",
        headers: { cookie: authCookie() },
        payload: {
          needs: [
            { categoryId: "c1", optionIds: ["o1", "o2", "o3"] },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Maximum 2 options per category");
    });

    it("rejects URLs in context text", async () => {
      stubApprovedSession();
      stubProjectOwnership();

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1/needs",
        headers: { cookie: authCookie() },
        payload: {
          needs: [
            {
              categoryId: "c1",
              optionIds: ["o1"],
              contextText: "Visit https://example.com for details",
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("URLs are not allowed");
    });

    it("rejects zero options per category", async () => {
      stubApprovedSession();
      stubProjectOwnership();

      const response = await app.inject({
        method: "PUT",
        url: "/api/projects/proj-1/needs",
        headers: { cookie: authCookie() },
        payload: {
          needs: [
            { categoryId: "c1", optionIds: [] },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("At least 1 option required");
    });
  });

  // =========================================================================
  // DELETE /api/projects/:id
  // =========================================================================
  describe("DELETE /api/projects/:id", () => {
    it("allows owner to delete", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        creator: { userId: "user-1" },
      } as never);
      prismaMock.project.delete.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/projects/proj-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Project deleted");
    });

    it("allows admin to delete", async () => {
      const session = mockSession({ user: mockUser({ isAdmin: true }) });
      prismaMock.session.findUnique.mockResolvedValue(session as never);
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        creator: { userId: "other-user" },
      } as never);
      prismaMock.project.delete.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/projects/proj-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
    });

    it("rejects non-owner non-admin delete", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        id: "proj-1",
        creator: { userId: "other-user" },
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/projects/proj-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/projects/:id/matches
  // =========================================================================
  describe("GET /api/projects/:id/matches", () => {
    it("returns people whose skills overlap the project's needs", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        creator: { userId: "user-1", approvalStatus: "approved" },
        needs: [{ options: [{ optionId: "o1" }] }],
      } as never);
      prismaMock.profile.findMany.mockResolvedValue([
        {
          id: "profile-2",
          name: "Helper",
          handle: "helper",
          portraitUrl: null,
          skills: [{ option: { id: "o1", name: "AI / ML expertise", slug: "ai-ml-expertise" } }],
        },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects/proj-1/matches",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const { people } = response.json();
      expect(people).toHaveLength(1);
      expect(people[0].matchedSkills).toEqual([
        { id: "o1", name: "AI / ML expertise", slug: "ai-ml-expertise" },
      ]);
    });

    it("returns an empty list when the project has no needs", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue({
        creator: { userId: "user-1", approvalStatus: "approved" },
        needs: [],
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects/proj-1/matches",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().people).toEqual([]);
      expect(prismaMock.profile.findMany).not.toHaveBeenCalled();
    });

    it("returns 404 for a non-existent project", async () => {
      stubApprovedSession();
      prismaMock.project.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects/missing/matches",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
