import type { FastifyInstance } from "fastify";
import { authAndApproved } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { stripe, EMPLOYER_PRICE_ID } from "../lib/stripe.js";
import { env } from "../lib/env.js";

// =============================================================================
// BILLING ROUTES (Stripe)
// =============================================================================

export async function billingRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // POST /billing/checkout
  // Create Stripe Checkout Session for employer subscription
  // ---------------------------------------------------------------------------
  app.post(
    "/checkout",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      // Already an employer?
      if (user.isEmployer) {
        return reply.status(400).send({ error: "Already subscribed as employer" });
      }

      // Get full user record to check for existing Stripe customer
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        return reply.status(404).send({ error: "User not found" });
      }

      let customerId = dbUser.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: dbUser.email,
          metadata: {
            userId: dbUser.id,
          },
        });

        customerId = customer.id;

        // Store customer ID
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price: EMPLOYER_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${env.APP_URL}/account/billing?success=true`,
        cancel_url: `${env.APP_URL}/account/billing?canceled=true`,
        metadata: {
          userId: dbUser.id,
        },
      });

      return reply.status(200).send({ url: session.url });
    }
  );

  // ---------------------------------------------------------------------------
  // POST /billing/portal
  // Create Stripe Customer Portal session
  // ---------------------------------------------------------------------------
  app.post(
    "/portal",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      // Get full user record
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (!dbUser.stripeCustomerId) {
        return reply.status(400).send({ error: "No billing account found" });
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: `${env.APP_URL}/account/billing`,
      });

      return reply.status(200).send({ url: session.url });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /billing/status
  // Get current billing status
  // ---------------------------------------------------------------------------
  app.get(
    "/status",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          isEmployer: true,
          stripeCustomerId: true,
        },
      });

      if (!dbUser) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.status(200).send({
        isEmployer: dbUser.isEmployer,
        hasStripeAccount: !!dbUser.stripeCustomerId,
      });
    }
  );
}
