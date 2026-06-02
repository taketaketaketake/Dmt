import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, prismaMock, resetPrismaMock } from "../test/helpers.js";

describe("Needs Routes", () => {
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

  describe("GET /api/needs/taxonomy", () => {
    it("returns the full taxonomy without an offerable filter", async () => {
      prismaMock.needCategory.findMany.mockResolvedValue([
        { id: "c1", name: "Capital", slug: "capital", sortOrder: 0, options: [] },
      ] as never);

      const response = await app.inject({ method: "GET", url: "/api/needs/taxonomy" });

      expect(response.statusCode).toBe(200);
      // No offerable filter -> options where clause is just { active: true }
      expect(prismaMock.needCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            options: expect.objectContaining({ where: { active: true } }),
          }),
        })
      );
    });

    it("filters options to offerable and drops empty categories when ?offerable=1", async () => {
      prismaMock.needCategory.findMany.mockResolvedValue([
        {
          id: "c1",
          name: "Product & Engineering",
          slug: "product-engineering",
          sortOrder: 0,
          options: [
            { id: "o1", name: "AI / ML expertise", slug: "ai-ml-expertise", sortOrder: 0, offerable: true },
          ],
        },
        // A category whose offerable options were all filtered out
        { id: "c2", name: "Visibility", slug: "visibility", sortOrder: 1, options: [] },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/needs/taxonomy?offerable=1",
      });

      expect(response.statusCode).toBe(200);
      const { categories } = response.json();
      // Empty category dropped
      expect(categories).toHaveLength(1);
      expect(categories[0].slug).toBe("product-engineering");
      // Query restricted options to offerable
      expect(prismaMock.needCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            options: expect.objectContaining({
              where: { active: true, offerable: true },
            }),
          }),
        })
      );
    });
  });
});
