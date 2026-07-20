import "dotenv/config";
import { PrismaClient, type JobType, type ProjectStatus } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// DEMO CONTENT SEED (additive / non-destructive)
//
// Populates People, Projects, and Jobs with founder-flavored placeholder data
// so a fresh white-label deployment doesn't look empty. Safe to run repeatedly
// (upserts by email/handle; projects and jobs matched by natural keys).
//
// All demo users live on the @demo.example.com domain, so removing everything
// later is one query:
//   DELETE FROM "User" WHERE email LIKE '%@demo.example.com';
// (Profiles, projects, and jobs cascade.)
//
// Run with:  npx tsx prisma/seed-demo.ts
// =============================================================================

const THIRTY_DAYS = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

interface DemoPerson {
  email: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  portraitUrl: string;
  isEmployer?: boolean;
  categories: string[]; // Category slugs
  skills: string[]; // offerable NeedOption slugs
}

const PEOPLE: DemoPerson[] = [
  {
    email: "maya@demo.example.com",
    name: "Maya Reynolds",
    handle: "mayareynolds",
    bio: "Founder of Rise & Grind Baking Co. — three locations and counting. Deep in pricing strategy and expansion financing right now.",
    location: "Atlanta, GA",
    portraitUrl: "https://i.pravatar.cc/300?img=47",
    isEmployer: true,
    categories: ["consumer"],
    skills: ["pricing-monetization", "customer-discovery"],
  },
  {
    email: "devon@demo.example.com",
    name: "Devon Carter",
    handle: "devoncarter",
    bio: "Building FreightLine, a dispatch platform for small trucking fleets. Former fleet operations manager, self-taught on the numbers.",
    location: "Charlotte, NC",
    portraitUrl: "https://i.pravatar.cc/300?img=12",
    isEmployer: true,
    categories: ["mobility", "developer-tools"],
    skills: ["operations-logistics", "enterprise-sales"],
  },
  {
    email: "priya@demo.example.com",
    name: "Priya Natarajan",
    handle: "priyabuilds",
    bio: "CPA turned founder. I get early-stage books investor-ready — and I'm building LedgerLift to automate the cleanup.",
    location: "Chicago, IL",
    portraitUrl: "https://i.pravatar.cc/300?img=32",
    isEmployer: true,
    categories: ["fintech"],
    skills: ["accounting-finance", "pricing-monetization", "contracts-compliance"],
  },
  {
    email: "marcus@demo.example.com",
    name: "Marcus Webb",
    handle: "marcuswebb",
    bio: "Second-time founder — first company acquired in 2023, now building in home services. Happy to share fundraising scar tissue.",
    location: "Dallas, TX",
    portraitUrl: "https://i.pravatar.cc/300?img=59",
    categories: ["consumer"],
    skills: ["advisors-mentors", "marketing-growth"],
  },
  {
    email: "alicia@demo.example.com",
    name: "Alicia Fontaine",
    handle: "aliciafontaine",
    bio: "Brand designer for 12 years, founding partner at a studio focused on food & beverage startups.",
    location: "New Orleans, LA",
    portraitUrl: "https://i.pravatar.cc/300?img=25",
    isEmployer: true,
    categories: ["media-content", "consumer"],
    skills: ["brand-identity", "design-systems", "ux-design-feedback"],
  },
  {
    email: "sam@demo.example.com",
    name: "Sam Okafor",
    handle: "samokafor",
    bio: "Engineer-founder building inventory forecasting for independent retailers. Learning the finance side one report at a time.",
    location: "Columbus, OH",
    portraitUrl: "https://i.pravatar.cc/300?img=68",
    categories: ["commerce-retail", "ai-ml"],
    skills: ["ai-ml-expertise", "data-engineering", "mvp-build-support"],
  },
];

interface DemoProject {
  creatorHandle: string;
  title: string;
  description: string;
  status: ProjectStatus;
  categories: string[]; // Category slugs
  needs: {
    categorySlug: string; // NeedCategory slug
    optionSlugs: string[]; // NeedOption slugs
    contextText?: string;
  }[];
}

const PROJECTS: DemoProject[] = [
  {
    creatorHandle: "devoncarter",
    title: "FreightLine Dispatch",
    description:
      "Dispatch and settlement platform for trucking fleets under 20 trucks. Live with 14 fleets; working toward breakeven on current pricing.",
    status: "active",
    categories: ["mobility"],
    needs: [
      {
        categorySlug: "capital-financial",
        optionSlugs: ["seeking-preseed-seed", "intro-angels"],
        contextText: "Raising a $500k pre-seed to expand into two new states.",
      },
      { categorySlug: "go-to-market", optionSlugs: ["enterprise-sales"] },
    ],
  },
  {
    creatorHandle: "mayareynolds",
    title: "Rise & Grind — Third Location",
    description:
      "Opening our third bakery location. Modeling the buildout budget and 12-month projections before we sign the lease.",
    status: "active",
    categories: ["consumer"],
    needs: [
      {
        categorySlug: "capital-financial",
        optionSlugs: ["grant-opportunities", "revenue-customer-leads"],
        contextText: "Exploring small-business grants before taking on debt.",
      },
    ],
  },
  {
    creatorHandle: "priyabuilds",
    title: "LedgerLift",
    description:
      "Automated bookkeeping cleanup for seed-stage startups — investor-ready books in a week instead of a month.",
    status: "active",
    categories: ["fintech"],
    needs: [
      {
        categorySlug: "people-partners",
        optionSlugs: ["technical-cofounder"],
        contextText: "Looking for a technical co-founder to own the product.",
      },
    ],
  },
  {
    creatorHandle: "samokafor",
    title: "ShelfSense",
    description:
      "Inventory forecasting that pays for itself — helping independent retailers order what actually sells.",
    status: "active",
    categories: ["commerce-retail"],
    needs: [
      {
        categorySlug: "design-ux",
        optionSlugs: ["ux-design-feedback", "brand-identity"],
      },
      { categorySlug: "go-to-market", optionSlugs: ["customer-discovery"] },
    ],
  },
];

interface DemoJob {
  posterHandle: string;
  title: string;
  companyName: string;
  description: string;
  type: JobType;
  applyUrl: string;
}

const JOBS: DemoJob[] = [
  {
    posterHandle: "mayareynolds",
    title: "Part-Time Bookkeeper",
    companyName: "Rise & Grind Baking Co.",
    description:
      "Own weekly reconciliation and monthly close across three locations. QuickBooks experience required; food & beverage experience a plus. ~15 hrs/week, remote-friendly.",
    type: "part_time",
    applyUrl: "https://example.com/rise-grind/bookkeeper",
  },
  {
    posterHandle: "priyabuilds",
    title: "Founding Engineer",
    companyName: "LedgerLift",
    description:
      "First engineering hire. Build the ingestion pipeline that turns messy exports into clean ledgers. TypeScript + Postgres. Meaningful equity.",
    type: "full_time",
    applyUrl: "https://example.com/ledgerlift/founding-engineer",
  },
  {
    posterHandle: "devoncarter",
    title: "Operations Coordinator",
    companyName: "FreightLine",
    description:
      "Support our fleet customers through onboarding and daily dispatch questions. Logistics background preferred; you'll learn the product deeply.",
    type: "full_time",
    applyUrl: "https://example.com/freightline/ops-coordinator",
  },
  {
    posterHandle: "aliciafontaine",
    title: "Brand Identity Project — Fast-Casual Concept",
    companyName: "Fontaine Studio",
    description:
      "8-week contract: naming, identity system, and packaging for a new fast-casual restaurant group. Portfolio with food & beverage work required.",
    type: "contract",
    applyUrl: "https://example.com/fontaine/brand-contract",
  },
];

async function main() {
  const now = new Date();
  const profileByHandle = new Map<string, string>(); // handle -> profileId

  // ── People ────────────────────────────────────────────────────────────────
  for (const p of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { status: "approved", isEmployer: p.isEmployer ?? false },
      create: {
        email: p.email,
        status: "approved",
        isEmployer: p.isEmployer ?? false,
      },
    });

    const profileData = {
      name: p.name,
      bio: p.bio,
      location: p.location,
      portraitUrl: p.portraitUrl,
      approvalStatus: "approved" as const,
      approvedAt: now,
    };
    const profile = await prisma.profile.upsert({
      where: { handle: p.handle },
      update: profileData,
      create: { ...profileData, handle: p.handle, userId: user.id },
    });
    profileByHandle.set(p.handle, profile.id);

    // Categories (replace)
    const categories = await prisma.category.findMany({
      where: { slug: { in: p.categories } },
      select: { id: true },
    });
    await prisma.profileCategory.deleteMany({ where: { profileId: profile.id } });
    await prisma.profileCategory.createMany({
      data: categories.map((c) => ({ profileId: profile.id, categoryId: c.id })),
    });

    // Skills (replace)
    const options = await prisma.needOption.findMany({
      where: { slug: { in: p.skills } },
      select: { id: true },
    });
    await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
    await prisma.profileSkill.createMany({
      data: options.map((o) => ({ profileId: profile.id, optionId: o.id })),
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  for (const pr of PROJECTS) {
    const creatorId = profileByHandle.get(pr.creatorHandle)!;
    let project = await prisma.project.findFirst({
      where: { title: pr.title, creatorId },
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          creatorId,
          title: pr.title,
          description: pr.description,
          status: pr.status,
        },
      });
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: { description: pr.description, status: pr.status },
      });
    }

    const categories = await prisma.category.findMany({
      where: { slug: { in: pr.categories } },
      select: { id: true },
    });
    await prisma.projectCategory.deleteMany({ where: { projectId: project.id } });
    await prisma.projectCategory.createMany({
      data: categories.map((c) => ({ projectId: project.id, categoryId: c.id })),
    });

    for (const need of pr.needs) {
      const category = await prisma.needCategory.findUnique({
        where: { slug: need.categorySlug },
        select: { id: true },
      });
      if (!category) continue;
      const options = await prisma.needOption.findMany({
        where: { slug: { in: need.optionSlugs }, categoryId: category.id },
        select: { id: true },
      });
      const row = await prisma.projectNeed.upsert({
        where: {
          projectId_categoryId: { projectId: project.id, categoryId: category.id },
        },
        update: { contextText: need.contextText ?? null },
        create: {
          projectId: project.id,
          categoryId: category.id,
          contextText: need.contextText ?? null,
        },
      });
      await prisma.projectNeedOption.deleteMany({ where: { projectNeedId: row.id } });
      await prisma.projectNeedOption.createMany({
        data: options.map((o) => ({ projectNeedId: row.id, optionId: o.id })),
      });
    }
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────
  for (const job of JOBS) {
    const posterId = profileByHandle.get(job.posterHandle)!;
    const existing = await prisma.job.findFirst({
      where: { title: job.title, companyName: job.companyName },
    });
    if (existing) continue;
    await prisma.job.create({
      data: {
        posterId,
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        type: job.type,
        applyUrl: job.applyUrl,
        active: true,
        moderationStatus: "approved",
        reviewedAt: now,
        expiresAt: THIRTY_DAYS,
      },
    });
  }

  console.log(
    `Demo content ready: ${PEOPLE.length} people, ${PROJECTS.length} projects, ${JOBS.length} jobs (all under @demo.example.com)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
