import type { FastifyInstance } from "fastify";
import { stripe } from "../lib/stripe.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import type Stripe from "stripe";

// =============================================================================
// WEBHOOK ROUTES
// =============================================================================

export async function webhookRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // POST /webhooks/stripe
  // Handle Stripe webhook events
  // ---------------------------------------------------------------------------
  app.post("/stripe", async (request, reply) => {
    const signature = request.headers["stripe-signature"];

    if (!signature) {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    // Access rawBody that was added by our custom content type parser
    const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;

    if (!rawBody) {
      return reply.status(400).send({ error: "Missing request body" });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        app.log.error(`Webhook signature verification failed: ${message}`);
        return reply.status(400).send({ error: `Webhook Error: ${message}` });
      }

      // Log event for debugging
      app.log.info(`Stripe webhook received: ${event.type}`);

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, app);
          break;
        }

        case "customer.subscription.deleted": {
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, app);
          break;
        }

        case "invoice.payment_failed": {
          await handlePaymentFailed(event.data.object as Stripe.Invoice, app);
          break;
        }

        default: {
          app.log.info(`Unhandled event type: ${event.type}`);
        }
      }

      return reply.status(200).send({ received: true });
    }
  );
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed
 * User completed checkout -> grant employer capability
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  app: FastifyInstance
): Promise<void> {
  const customerId = session.customer as string;

  if (!customerId) {
    app.log.error("checkout.session.completed: No customer ID");
    return;
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    app.log.error(`checkout.session.completed: No user found for customer ${customerId}`);
    return;
  }

  // Grant employer capability
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmployer: true },
  });

  app.log.info(`User ${user.id} granted employer capability`);
}

/**
 * Handle customer.subscription.deleted
 * Subscription canceled or expired -> revoke employer capability
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  app: FastifyInstance
): Promise<void> {
  const customerId = subscription.customer as string;

  if (!customerId) {
    app.log.error("customer.subscription.deleted: No customer ID");
    return;
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    app.log.error(`customer.subscription.deleted: No user found for customer ${customerId}`);
    return;
  }

  // Revoke employer capability
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmployer: false },
  });

  app.log.info(`User ${user.id} employer capability revoked`);
}

/**
 * Handle invoice.payment_failed
 * Payment failed -> revoke employer capability immediately
 * TODO: Could implement grace period logic here
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  app: FastifyInstance
): Promise<void> {
  const customerId = invoice.customer as string;

  if (!customerId) {
    app.log.error("invoice.payment_failed: No customer ID");
    return;
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    app.log.error(`invoice.payment_failed: No user found for customer ${customerId}`);
    return;
  }

  // Revoke employer capability on payment failure
  // TODO: Could implement grace period - for now, immediate revocation
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmployer: false },
  });

  app.log.info(`User ${user.id} employer capability revoked due to payment failure`);
}
