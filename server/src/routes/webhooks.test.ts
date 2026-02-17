import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  stripeMock,
  mockUser,
} from "../test/helpers.js";

describe("Webhook Routes", () => {
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
    stripeMock.webhooks.constructEvent.mockReset();
  });

  function stripeHeaders(signature = "sig_valid") {
    return { "stripe-signature": signature };
  }

  // =========================================================================
  // POST /webhooks/stripe
  // =========================================================================
  describe("POST /webhooks/stripe", () => {
    it("returns 400 when stripe-signature header is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe",
        payload: { type: "test" },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Missing stripe-signature header");
    });

    it("returns 400 when signature verification fails", async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe",
        headers: stripeHeaders("bad_sig"),
        payload: { type: "test" },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("Webhook Error");
    });

    // -----------------------------------------------------------------------
    // checkout.session.completed
    // -----------------------------------------------------------------------
    describe("checkout.session.completed", () => {
      it("grants isEmployer when valid", async () => {
        const user = mockUser({ id: "user-1", isEmployer: false, stripeCustomerId: "cus_123" });

        stripeMock.webhooks.constructEvent.mockReturnValue({
          type: "checkout.session.completed",
          data: { object: { customer: "cus_123" } },
        });
        prismaMock.user.findUnique.mockResolvedValue(user as never);
        prismaMock.user.update.mockResolvedValue({ ...user, isEmployer: true } as never);

        const response = await app.inject({
          method: "POST",
          url: "/webhooks/stripe",
          headers: stripeHeaders(),
          payload: {},
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().received).toBe(true);
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: "user-1" },
          data: { isEmployer: true },
        });
      });

      it("skips update when user is already employer (idempotent)", async () => {
        const user = mockUser({ isEmployer: true, stripeCustomerId: "cus_123" });

        stripeMock.webhooks.constructEvent.mockReturnValue({
          type: "checkout.session.completed",
          data: { object: { customer: "cus_123" } },
        });
        prismaMock.user.findUnique.mockResolvedValue(user as never);

        const response = await app.inject({
          method: "POST",
          url: "/webhooks/stripe",
          headers: stripeHeaders(),
          payload: {},
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // customer.subscription.deleted
    // -----------------------------------------------------------------------
    describe("customer.subscription.deleted", () => {
      it("revokes isEmployer when valid", async () => {
        const user = mockUser({ isEmployer: true, stripeCustomerId: "cus_123" });

        stripeMock.webhooks.constructEvent.mockReturnValue({
          type: "customer.subscription.deleted",
          data: { object: { customer: "cus_123" } },
        });
        prismaMock.user.findUnique.mockResolvedValue(user as never);
        prismaMock.user.update.mockResolvedValue({ ...user, isEmployer: false } as never);

        const response = await app.inject({
          method: "POST",
          url: "/webhooks/stripe",
          headers: stripeHeaders(),
          payload: {},
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: "user-1" },
          data: { isEmployer: false },
        });
      });

      it("skips revocation when user is already not employer (idempotent)", async () => {
        const user = mockUser({ isEmployer: false, stripeCustomerId: "cus_123" });

        stripeMock.webhooks.constructEvent.mockReturnValue({
          type: "customer.subscription.deleted",
          data: { object: { customer: "cus_123" } },
        });
        prismaMock.user.findUnique.mockResolvedValue(user as never);

        const response = await app.inject({
          method: "POST",
          url: "/webhooks/stripe",
          headers: stripeHeaders(),
          payload: {},
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // invoice.payment_failed
    // -----------------------------------------------------------------------
    describe("invoice.payment_failed", () => {
      it("revokes isEmployer on payment failure", async () => {
        const user = mockUser({ isEmployer: true, stripeCustomerId: "cus_123" });

        stripeMock.webhooks.constructEvent.mockReturnValue({
          type: "invoice.payment_failed",
          data: { object: { customer: "cus_123" } },
        });
        prismaMock.user.findUnique.mockResolvedValue(user as never);
        prismaMock.user.update.mockResolvedValue({ ...user, isEmployer: false } as never);

        const response = await app.inject({
          method: "POST",
          url: "/webhooks/stripe",
          headers: stripeHeaders(),
          payload: {},
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: "user-1" },
          data: { isEmployer: false },
        });
      });
    });

    // -----------------------------------------------------------------------
    // Unknown event type
    // -----------------------------------------------------------------------
    it("returns 200 for unknown event types", async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: "some.unknown.event",
        data: { object: {} },
      });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe",
        headers: stripeHeaders(),
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().received).toBe(true);
    });
  });
});
