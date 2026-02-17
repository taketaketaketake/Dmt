import { vi } from "vitest";

export const stripeMock = {
  webhooks: {
    constructEvent: vi.fn(),
  },
  customers: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
};

vi.mock("../../lib/stripe.js", () => ({
  stripe: stripeMock,
  EMPLOYER_PRICE_ID: "price_test_fake",
}));
