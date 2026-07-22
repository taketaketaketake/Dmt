import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../test/helpers.js";

describe("Tenant Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves public runtime branding without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/tenant" });

    expect(response.statusCode).toBe(200);
    const { tenant } = response.json();
    expect(tenant.name).toBeTruthy();
    expect(tenant.tagline).toBeTruthy();
    // Unset optional assets come back as explicit nulls
    expect(tenant).toHaveProperty("logoUrl");
    expect(tenant).toHaveProperty("faviconUrl");
    // Theme always resolves (defaults to "default")
    expect(tenant.theme).toBeTruthy();
  });
});
