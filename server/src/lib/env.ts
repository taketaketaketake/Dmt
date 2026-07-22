// Environment configuration
// Validates required environment variables at startup

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// White-label branding (multi-tenant plan §11). Per-client deployments
// override via env; used in transactional email subjects/headings and as
// the default EMAIL_FROM sender name.
const BRAND_NAME = optionalEnv("BRAND_NAME", "Social Network");

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Branding
  BRAND_NAME,
  BRAND_TAGLINE: optionalEnv("BRAND_TAGLINE", "A curated archive of builders in Detroit"),
  BRAND_LOGO_URL: optionalEnv("BRAND_LOGO_URL", ""),
  BRAND_FAVICON_URL: optionalEnv("BRAND_FAVICON_URL", ""),
  // Visual theme for the deployment. "default" = editorial ink/paper;
  // "dynamichqi" = DynamicHQI navy/gold (see web/src/styles/themes.css).
  BRAND_THEME: optionalEnv("BRAND_THEME", "default"),

  // Server
  PORT: parseInt(optionalEnv("PORT", "3000"), 10),
  HOST: optionalEnv("HOST", "localhost"),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),

  // Session
  SESSION_SECRET: requireEnv("SESSION_SECRET"),
  SESSION_MAX_AGE_DAYS: parseInt(optionalEnv("SESSION_MAX_AGE_DAYS", "30"), 10),

  // Magic Link
  MAGIC_LINK_EXPIRY_MINUTES: parseInt(optionalEnv("MAGIC_LINK_EXPIRY_MINUTES", "15"), 10),
  APP_URL: requireEnv("APP_URL"),

  // Email (Resend). RESEND_API_KEY is optional in dev/test, required in prod.
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY", ""),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", `${BRAND_NAME} <noreply@example.com>`),

  // Stripe (billing). Optional so the app can run with billing disabled;
  // billing endpoints return an error until these are configured.
  STRIPE_SECRET_KEY: optionalEnv("STRIPE_SECRET_KEY", ""),
  STRIPE_WEBHOOK_SECRET: optionalEnv("STRIPE_WEBHOOK_SECRET", ""),
  STRIPE_PRICE_ID: optionalEnv("STRIPE_PRICE_ID", ""), // Employer subscription price

  // Cloudflare R2 (object storage for uploads).
  // Optional in dev/test (falls back to local disk); required in production.
  R2_ACCOUNT_ID: optionalEnv("R2_ACCOUNT_ID", ""),
  R2_ACCESS_KEY_ID: optionalEnv("R2_ACCESS_KEY_ID", ""),
  R2_SECRET_ACCESS_KEY: optionalEnv("R2_SECRET_ACCESS_KEY", ""),
  R2_BUCKET: optionalEnv("R2_BUCKET", ""),
  R2_PUBLIC_URL: optionalEnv("R2_PUBLIC_URL", ""), // public base URL / custom domain for the bucket

  // Derived
  get isDev() {
    return this.NODE_ENV === "development";
  },
  get isProd() {
    return this.NODE_ENV === "production";
  },
  get isR2Configured() {
    return Boolean(
      this.R2_ACCOUNT_ID &&
        this.R2_ACCESS_KEY_ID &&
        this.R2_SECRET_ACCESS_KEY &&
        this.R2_BUCKET &&
        this.R2_PUBLIC_URL
    );
  },
  get isStripeConfigured() {
    return Boolean(this.STRIPE_SECRET_KEY && this.STRIPE_PRICE_ID);
  },
} as const;

// Fail fast: object storage must be configured in production so uploads
// don't silently land on the ephemeral container filesystem.
if (env.isProd && !env.isR2Configured) {
  throw new Error(
    "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
      "R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL in production."
  );
}

// Fail fast: email delivery (Resend) must be configured in production.
if (env.isProd && !env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set. It is required in production.");
}
