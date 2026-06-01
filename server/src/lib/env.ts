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

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

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

  // SMTP (email)
  SMTP_HOST: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
  SMTP_PORT: parseInt(optionalEnv("SMTP_PORT", "465"), 10),
  SMTP_USER: requireEnv("SMTP_USER"),
  SMTP_PASS: requireEnv("SMTP_PASS"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", "Detroit Directory <noreply@example.com>"),

  // Stripe
  STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requireEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: requireEnv("STRIPE_PRICE_ID"), // Employer subscription price

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
} as const;

// Fail fast: object storage must be configured in production so uploads
// don't silently land on the ephemeral container filesystem.
if (env.isProd && !env.isR2Configured) {
  throw new Error(
    "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
      "R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL in production."
  );
}
