// =============================================================================
// TEST SETUP
// Set environment variables before any app code loads
// =============================================================================

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/dmt_test";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
process.env.APP_URL = "http://localhost:5173";
process.env.RESEND_API_KEY = "re_test_fake";
process.env.EMAIL_FROM = "Test <noreply@test.com>";
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
process.env.STRIPE_PRICE_ID = "price_test_fake";
process.env.NODE_ENV = "test";

import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
});
