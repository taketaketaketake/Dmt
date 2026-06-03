import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, prismaMock, resetPrismaMock } from "../test/helpers.js";

describe("Categories Routes", () => {
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

  describe("GET /api/categories", () => {
    it("returns industry categories by default", async () => {
      prismaMock.category.findMany.mockResolvedValue([
        { id: "c1", name: "FinTech", slug: "fintech", type: "industry" },
      ] as never);

      const response = await app.inject({ method: "GET", url: "/api/categories" });

      expect(response.statusCode).toBe(200);
      expect(response.json().categories).toHaveLength(1);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: "industry" } })
      );
    });

    it("falls back to industry for an invalid type", async () => {
      prismaMock.category.findMany.mockResolvedValue([] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/categories?type=bogus",
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: "industry" } })
      );
    });

    it("honors a valid type query", async () => {
      prismaMock.category.findMany.mockResolvedValue([] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/categories?type=skill",
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: "skill" } })
      );
    });
  });
});
