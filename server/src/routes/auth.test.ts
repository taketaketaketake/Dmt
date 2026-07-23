import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  sendMagicLinkEmail,
  mockUser,
  mockSession,
  authCookie,
} from "../test/helpers.js";

describe("Auth Routes", () => {
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
    sendMagicLinkEmail.mockClear();
  });

  // =========================================================================
  // POST /auth/login
  // =========================================================================
  describe("POST /auth/login", () => {
    it("returns 400 when email is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Email is required");
    });

    it("returns 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "not-an-email" },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid email format");
    });

    it("creates user and token for new user", async () => {
      const user = mockUser({ id: "new-user", email: "new@example.com" });
      prismaMock.user.findUnique.mockResolvedValue(null as never);
      prismaMock.user.create.mockResolvedValue(user as never);
      prismaMock.user.findMany.mockResolvedValue([] as never);
      prismaMock.magicLinkToken.create.mockResolvedValue({
        id: "token-1",
        token: "mock-token",
        userId: user.id,
        expiresAt: new Date(),
        used: false,
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "new@example.com" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Magic link sent");
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "new@example.com",
            status: "pending",
          }),
        })
      );
      expect(sendMagicLinkEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "new@example.com" })
      );
    });

    it("creates an approved user when access approval is disabled", async () => {
      const original = env.REQUIRE_ACCESS_APPROVAL;
      (env as { REQUIRE_ACCESS_APPROVAL: boolean }).REQUIRE_ACCESS_APPROVAL = false;
      const user = mockUser({ id: "new-user", email: "new@example.com", status: "approved" });
      prismaMock.user.findUnique.mockResolvedValue(null as never);
      prismaMock.user.create.mockResolvedValue(user as never);
      prismaMock.magicLinkToken.create.mockResolvedValue({
        id: "token-1", token: "mock-token", userId: user.id,
        expiresAt: new Date(), used: false,
      } as never);

      try {
        const response = await app.inject({
          method: "POST", url: "/auth/login", payload: { email: "new@example.com" },
        });
        expect(response.statusCode).toBe(200);
        expect(prismaMock.user.create).toHaveBeenCalledWith({
          data: { email: "new@example.com", status: "approved" },
        });
      } finally {
        (env as { REQUIRE_ACCESS_APPROVAL: boolean }).REQUIRE_ACCESS_APPROVAL = original;
      }
    });

    it("finds existing user and creates token", async () => {
      const user = mockUser();
      prismaMock.user.findUnique.mockResolvedValue(user as never);
      prismaMock.magicLinkToken.create.mockResolvedValue({
        id: "token-1",
        token: "mock-token",
        userId: user.id,
        expiresAt: new Date(),
        used: false,
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com" },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(sendMagicLinkEmail).toHaveBeenCalled();
    });

    it("creates a new pending user without notifying admins at signup", async () => {
      // Admins are notified when a profile is submitted for review, not at
      // signup — so /auth/login must not look up or email admins.
      const user = mockUser({ id: "new-user", email: "new@example.com" });
      prismaMock.user.findUnique.mockResolvedValue(null as never);
      prismaMock.user.create.mockResolvedValue(user as never);
      prismaMock.magicLinkToken.create.mockResolvedValue({
        id: "token-1",
        token: "mock-token",
        userId: user.id,
        expiresAt: new Date(),
        used: false,
      } as never);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "new@example.com" },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { email: "new@example.com", status: "pending" },
      });
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
      expect(sendMagicLinkEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "new@example.com" })
      );
    });

    it("normalizes email to lowercase", async () => {
      const user = mockUser();
      prismaMock.user.findUnique.mockResolvedValue(user as never);
      prismaMock.magicLinkToken.create.mockResolvedValue({
        id: "token-1",
        token: "mock-token",
        userId: user.id,
        expiresAt: new Date(),
        used: false,
      } as never);

      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "  TEST@Example.COM  " },
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });

  // =========================================================================
  // GET /auth/verify
  // =========================================================================
  describe("GET /auth/verify", () => {
    it("returns 400 when token is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/verify",
      });
      expect(response.statusCode).toBe(400);
    });

    it("redirects invalid tokens back to the branded login page", async () => {
      prismaMock.magicLinkToken.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/verify?token=bad-token",
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        "http://localhost:5173/login?error=invalid-or-expired-link"
      );
    });

    it("returns 401 for expired token", async () => {
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({
        id: "tok-1",
        token: "expired-token",
        userId: "user-1",
        used: false,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        user: mockUser(),
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/verify?token=expired-token",
      });
      expect(response.statusCode).toBe(302);
    });

    it("allows a prefetched token to be used again until it expires", async () => {
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({
        id: "tok-1",
        token: "used-token",
        userId: "user-1",
        used: true,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser(),
      } as never);
      prismaMock.user.update.mockResolvedValue(mockUser() as never);
      prismaMock.session.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/verify?token=used-token",
      });
      expect(response.statusCode).toBe(302);
      expect(prismaMock.session.create).toHaveBeenCalled();
    });

    it("creates session and redirects for valid token", async () => {
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({
        id: "tok-1",
        token: "valid-token",
        userId: "user-1",
        used: false,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser(),
      } as never);
      prismaMock.magicLinkToken.update.mockResolvedValue({} as never);
      prismaMock.user.update.mockResolvedValue(mockUser() as never);
      prismaMock.session.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/verify?token=valid-token",
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("http://localhost:5173/");
      // GET verification must not consume the token because mail scanners can
      // prefetch it before the user opens the message.
      expect(prismaMock.magicLinkToken.update).not.toHaveBeenCalled();
      // Session should be created
      expect(prismaMock.session.create).toHaveBeenCalled();
      // Cookie should be set
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("promotes a pending user and redirects to courses when approval is disabled", async () => {
      const original = env.REQUIRE_ACCESS_APPROVAL;
      (env as { REQUIRE_ACCESS_APPROVAL: boolean }).REQUIRE_ACCESS_APPROVAL = false;
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({
        id: "tok-1", token: "valid-token", userId: "user-1", used: false,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser({ status: "pending" }),
      } as never);
      prismaMock.magicLinkToken.update.mockResolvedValue({} as never);
      prismaMock.user.update.mockResolvedValue(mockUser({ status: "approved" }) as never);
      prismaMock.session.create.mockResolvedValue({} as never);

      try {
        const response = await app.inject({ method: "GET", url: "/auth/verify?token=valid-token" });
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("http://localhost:5173/courses");
        expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ status: "approved" }),
        }));
      } finally {
        (env as { REQUIRE_ACCESS_APPROVAL: boolean }).REQUIRE_ACCESS_APPROVAL = original;
      }
    });
  });

  // =========================================================================
  // POST /auth/logout
  // =========================================================================
  describe("POST /auth/logout", () => {
    it("clears cookie and returns 200 even without session", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Logged out");
    });

    it("deletes session and clears cookie when authenticated", async () => {
      prismaMock.session.delete.mockResolvedValue({} as never);

      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { cookie: authCookie() },
      });
      expect(response.statusCode).toBe(200);
      expect(prismaMock.session.delete).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });
  });

  // =========================================================================
  // GET /auth/me
  // =========================================================================
  describe("GET /auth/me", () => {
    it("returns 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns user and profile when authenticated", async () => {
      const session = mockSession();
      prismaMock.session.findUnique.mockResolvedValue(session as never);
      prismaMock.profile.findUnique.mockResolvedValue({
        id: "profile-1",
        userId: "user-1",
        name: "Test User",
        handle: "testuser",
        bio: "A bio",
        location: "Detroit",
        portraitUrl: null,
        approvalStatus: "approved",
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.id).toBe("user-1");
      expect(body.user.email).toBe("test@example.com");
      expect(body.profile).toBeDefined();
      expect(body.profile.handle).toBe("testuser");
    });

    it("returns null profile when user has no profile", async () => {
      const session = mockSession();
      prismaMock.session.findUnique.mockResolvedValue(session as never);
      prismaMock.profile.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().profile).toBeNull();
    });
  });
});
