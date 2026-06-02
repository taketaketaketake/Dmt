import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// V1 TAXONOMY DATA
// =============================================================================

interface TaxonomyOption {
  name: string;
  slug: string;
  // Whether a person can offer this as a skill (supply side). Demand-only
  // options (funding, exposure, access) default to false.
  offerable?: boolean;
}

interface TaxonomyCategory {
  name: string;
  slug: string;
  options: TaxonomyOption[];
}

const taxonomy: TaxonomyCategory[] = [
  {
    name: "Capital & Financial",
    slug: "capital-financial",
    options: [
      { name: "Seeking pre-seed / seed funding", slug: "seeking-preseed-seed" },
      { name: "Introductions to angels", slug: "intro-angels" },
      { name: "Introductions to VCs", slug: "intro-vcs" },
      { name: "Grant opportunities", slug: "grant-opportunities" },
      { name: "Revenue / customer leads", slug: "revenue-customer-leads" },
      { name: "Pricing or monetization guidance", slug: "pricing-monetization", offerable: true },
    ],
  },
  {
    name: "People & Partners",
    slug: "people-partners",
    options: [
      { name: "Technical co-founder", slug: "technical-cofounder", offerable: true },
      { name: "Product / design partner", slug: "product-design-partner", offerable: true },
      { name: "Business / operations partner", slug: "business-ops-partner", offerable: true },
      { name: "Sales or growth partner", slug: "sales-growth-partner", offerable: true },
      { name: "Advisors / mentors", slug: "advisors-mentors", offerable: true },
      { name: "Early employees or contractors", slug: "early-employees", offerable: true },
    ],
  },
  {
    name: "Product & Engineering",
    slug: "product-engineering",
    options: [
      { name: "Architecture or technical review", slug: "architecture-review", offerable: true },
      { name: "MVP build support", slug: "mvp-build-support", offerable: true },
      { name: "AI / ML expertise", slug: "ai-ml-expertise", offerable: true },
      { name: "Data engineering / analytics", slug: "data-engineering", offerable: true },
      { name: "Security or infrastructure guidance", slug: "security-infra", offerable: true },
      { name: "Hardware / physical product expertise", slug: "hardware-expertise", offerable: true },
    ],
  },
  {
    name: "Design & UX",
    slug: "design-ux",
    options: [
      { name: "UX / product design feedback", slug: "ux-design-feedback", offerable: true },
      { name: "Brand or identity help", slug: "brand-identity", offerable: true },
      { name: "Design systems or UI polish", slug: "design-systems", offerable: true },
      { name: "Prototyping or user testing", slug: "prototyping-testing", offerable: true },
    ],
  },
  {
    name: "Go-to-Market & Growth",
    slug: "go-to-market",
    options: [
      { name: "Customer discovery / interviews", slug: "customer-discovery", offerable: true },
      { name: "Marketing or growth strategy", slug: "marketing-growth", offerable: true },
      { name: "Distribution partnerships", slug: "distribution-partnerships", offerable: true },
      { name: "Enterprise sales guidance", slug: "enterprise-sales", offerable: true },
      { name: "Community or developer adoption", slug: "community-adoption", offerable: true },
    ],
  },
  {
    name: "Legal, Ops & Business Setup",
    slug: "legal-ops-business",
    options: [
      { name: "Incorporation or entity setup", slug: "incorporation-setup", offerable: true },
      { name: "IP or patent guidance", slug: "ip-patent", offerable: true },
      { name: "Contracts or compliance", slug: "contracts-compliance", offerable: true },
      { name: "Accounting / finance setup", slug: "accounting-finance", offerable: true },
      { name: "Operations or logistics help", slug: "operations-logistics", offerable: true },
    ],
  },
  {
    name: "Resources & Access",
    slug: "resources-access",
    options: [
      { name: "Access to specialized equipment", slug: "specialized-equipment" },
      { name: "Manufacturing or fabrication resources", slug: "manufacturing-fab" },
      { name: "Lab, studio, or workspace access", slug: "workspace-access" },
      { name: "Data sets or proprietary data access", slug: "data-access" },
      { name: "Beta users or pilot customers", slug: "beta-users" },
    ],
  },
  {
    name: "Visibility & Exposure",
    slug: "visibility-exposure",
    options: [
      { name: "Press or media exposure", slug: "press-media" },
      { name: "Speaking or demo opportunities", slug: "speaking-demos" },
      { name: "Showcase or launch support", slug: "showcase-launch" },
    ],
  },
];

// =============================================================================
// SEED FUNCTION (IDEMPOTENT)
// =============================================================================

async function seedNeedsTaxonomy() {
  console.log("Seeding needs taxonomy...");

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let optionsCreated = 0;
  let optionsUpdated = 0;

  for (let categoryIndex = 0; categoryIndex < taxonomy.length; categoryIndex++) {
    const categoryData = taxonomy[categoryIndex];

    // Upsert category
    const category = await prisma.needCategory.upsert({
      where: { slug: categoryData.slug },
      create: {
        name: categoryData.name,
        slug: categoryData.slug,
        sortOrder: categoryIndex,
        active: true,
      },
      update: {
        name: categoryData.name,
        sortOrder: categoryIndex,
        active: true,
      },
    });

    // Track if created or updated
    const existingCategory = await prisma.needCategory.findUnique({
      where: { slug: categoryData.slug },
    });
    if (existingCategory?.createdAt.getTime() === existingCategory?.createdAt.getTime()) {
      // This is a simplistic check; upsert doesn't tell us if it created or updated
      // For logging purposes, we'll count based on createdAt proximity to now
    }

    // Upsert options
    for (let optionIndex = 0; optionIndex < categoryData.options.length; optionIndex++) {
      const optionData = categoryData.options[optionIndex];

      await prisma.needOption.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: optionData.slug,
          },
        },
        create: {
          categoryId: category.id,
          name: optionData.name,
          slug: optionData.slug,
          sortOrder: optionIndex,
          active: true,
          offerable: optionData.offerable ?? false,
        },
        update: {
          name: optionData.name,
          sortOrder: optionIndex,
          active: true,
          offerable: optionData.offerable ?? false,
        },
      });
    }

    console.log(`  - ${categoryData.name}: ${categoryData.options.length} options`);
  }

  // Count totals
  const totalCategories = await prisma.needCategory.count();
  const totalOptions = await prisma.needOption.count();

  console.log(`\nNeeds taxonomy seeded successfully:`);
  console.log(`  - ${totalCategories} categories`);
  console.log(`  - ${totalOptions} options`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  await seedNeedsTaxonomy();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
