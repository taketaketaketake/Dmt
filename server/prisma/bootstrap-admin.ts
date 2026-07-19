import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// FIRST-ADMIN BOOTSTRAP
// Provisions the owner/admin for a fresh deployment (multi-tenant plan §11,
// step 3) so the approval queue has an operator before anyone else signs up.
//
// Usage: npm run bootstrap:admin -- owner@client.com
//
// Idempotent: creates the user if missing, promotes them if they exist.
// They sign in afterward via the normal magic-link flow — no password involved.
// =============================================================================

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: npm run bootstrap:admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true, status: "approved" },
    create: { email, isAdmin: true, status: "approved" },
  });

  console.log(`Admin ready: ${user.email} (id: ${user.id}, status: ${user.status})`);
  console.log("They can now sign in via magic link and access the admin dashboard.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
