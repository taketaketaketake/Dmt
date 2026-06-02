import Stripe from "stripe";
import { env } from "./env.js";

// Billing is optional at boot. When Stripe is not configured we still export a
// `stripe` object so importing routes don't break, but any attempt to actually
// use it throws a clear, actionable error instead of crashing the server at
// startup. Configure STRIPE_SECRET_KEY (+ STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET)
// to enable billing.
function createStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    return new Proxy({} as Stripe, {
      get() {
        throw new Error(
          "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, " +
            "and STRIPE_WEBHOOK_SECRET to enable billing."
        );
      },
    });
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// Stripe client singleton
export const stripe = createStripe();

// Employer subscription price ID
export const EMPLOYER_PRICE_ID = env.STRIPE_PRICE_ID;
