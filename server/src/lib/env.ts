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

  // Resend
  RESEND_API_KEY: requireEnv("RESEND_API_KEY"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", "Detroit Directory <noreply@example.com>"),

  // Stripe
  STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requireEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: requireEnv("STRIPE_PRICE_ID"), // Employer subscription price

  // Derived
  get isDev() {
    return this.NODE_ENV === "development";
  },
  get isProd() {
    return this.NODE_ENV === "production";
  },
} as const;
