import "dotenv/config";
import { PrismaClient, type JobType } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// EXAMPLE JOB POSTINGS (additive / non-destructive)
//
// Unlike prisma/seed.ts (which wipes and re-seeds everything), this script just
// adds a handful of example job postings to whatever approved profiles already
// exist locally. Safe to run repeatedly: jobs are matched on (title, companyName)
// and skipped if they already exist.
//
// Run with:  npx tsx prisma/seed-jobs.ts
// =============================================================================

const THIRTY_DAYS_FROM_NOW = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

// Example postings. `posterHandle` ties each job to an existing approved profile
// (the seed.ts employers). If that handle isn't present locally, we fall back to
// any approved profile so the script still works on a customized database.
const exampleJobs: {
  posterHandle: string;
  title: string;
  companyName: string;
  description: string;
  type: JobType;
  applyUrl: string;
}[] = [
  {
    posterHandle: "mayachen",
    title: "DevOps Engineer",
    companyName: "FactoryOS",
    description:
      "Own our CI/CD and cloud infrastructure as we scale to hundreds of factory floors. Terraform, GitHub Actions, and AWS experience required. $130k - $160k. Detroit, MI (Hybrid).",
    type: "full_time",
    applyUrl: "https://factoryos.io/careers/devops-engineer",
  },
  {
    posterHandle: "marcusj",
    title: "Product Designer",
    companyName: "AutoVision",
    description:
      "Shape the end-to-end experience of our vision inspection platform. Strong portfolio across research, interaction, and visual design expected. $115k - $140k. Detroit, MI.",
    type: "full_time",
    applyUrl: "https://autovision.dev/jobs/product-designer",
  },
  {
    posterHandle: "elenavasquez",
    title: "Field Robotics Technician",
    companyName: "Forge Robotics",
    description:
      "Install, calibrate, and support our collaborative robots at customer sites across Michigan. Hands-on mechatronics experience and a willingness to travel required. $70k - $95k. Detroit, MI.",
    type: "full_time",
    applyUrl: "https://forgerobotics.io/careers/field-technician",
  },
  {
    posterHandle: "marcusj",
    title: "Freelance ML Data Annotator",
    companyName: "AutoVision",
    description:
      "Label and review automotive defect imagery to improve our training datasets. Detail-oriented, flexible hours, fully remote. $25 - $35/hour. Remote (US).",
    type: "freelance",
    applyUrl: "https://autovision.dev/jobs/data-annotator",
  },
  {
    posterHandle: "mayachen",
    title: "Developer Advocate (Contract)",
    companyName: "FactoryOS",
    description:
      "Grow our open-source community through docs, demos, and conference talks. Comfortable writing code and explaining it to manufacturing engineers. 6-month contract, possible extension. $90k - $110k (pro-rated). Remote (Detroit preferred).",
    type: "contract",
    applyUrl: "https://factoryos.io/careers/developer-advocate",
  },
];

async function seedJobs() {
  console.log("Seeding example job postings...");

  // Map of handle -> profile id for the posters we reference.
  const profilesByHandle = new Map(
    (
      await prisma.profile.findMany({
        where: { approvalStatus: "approved" },
        select: { id: true, handle: true },
      })
    ).map((p) => [p.handle, p.id])
  );

  if (profilesByHandle.size === 0) {
    console.error(
      "No approved profiles found. Run `npx prisma db seed` first to create base data."
    );
    return;
  }

  // Fallback poster if a job's preferred handle isn't present locally.
  const fallbackPosterId = profilesByHandle.values().next().value as string;

  let created = 0;
  let skipped = 0;

  for (const job of exampleJobs) {
    const posterId = profilesByHandle.get(job.posterHandle) ?? fallbackPosterId;

    // Idempotency: skip if a job with the same title + company already exists.
    const existing = await prisma.job.findFirst({
      where: { title: job.title, companyName: job.companyName },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.job.create({
      data: {
        posterId,
        title: job.title,
        companyName: job.companyName,
        description: job.description,
        type: job.type,
        applyUrl: job.applyUrl,
        expiresAt: THIRTY_DAYS_FROM_NOW,
        active: true,
      },
    });
    created++;
  }

  const total = await prisma.job.count();
  console.log(
    `Example jobs seeded: ${created} created, ${skipped} already existed (${total} jobs total).`
  );
}

seedJobs()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
