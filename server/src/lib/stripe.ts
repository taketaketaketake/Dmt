import Stripe from "stripe";
import { env } from "./env.js";

// Stripe client singleton
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// Employer subscription price ID
export const EMPLOYER_PRICE_ID = env.STRIPE_PRICE_ID;
