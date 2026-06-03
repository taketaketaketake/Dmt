import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// PROJECT INDUSTRY CATEGORIES
// Controlled vocabulary for "category of the project" (CategoryType.industry).
// Stored in the generic Category table; linked to projects via ProjectCategory.
// =============================================================================

const industries: { name: string; slug: string }[] = [
  { name: "AI / ML", slug: "ai-ml" },
  { name: "Climate & Energy", slug: "climate-energy" },
  { name: "Consumer", slug: "consumer" },
  { name: "Health & Bio", slug: "health-bio" },
  { name: "FinTech", slug: "fintech" },
  { name: "Hardware & Robotics", slug: "hardware-robotics" },
  { name: "Developer Tools", slug: "developer-tools" },
  { name: "Media & Content", slug: "media-content" },
  { name: "Education", slug: "education" },
  { name: "Commerce & Retail", slug: "commerce-retail" },
  { name: "Mobility & Transportation", slug: "mobility" },
  { name: "Real Estate & Construction", slug: "real-estate-construction" },
  { name: "Gaming", slug: "gaming" },
  { name: "Social Impact & Nonprofit", slug: "social-impact" },
  { name: "Other", slug: "other" },
];

async function seedCategories() {
  console.log("Seeding project industry categories...");

  for (const industry of industries) {
    await prisma.category.upsert({
      where: { slug: industry.slug },
      create: { name: industry.name, slug: industry.slug, type: "industry" },
      update: { name: industry.name, type: "industry" },
    });
  }

  const total = await prisma.category.count({ where: { type: "industry" } });
  console.log(`Industry categories seeded: ${total}`);
}

seedCategories()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
