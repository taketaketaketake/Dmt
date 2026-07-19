import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// COURSE SEED (ADR-010)
// Loads/updates a course from a JSON manifest. This IS the authoring tool in
// v1 — there is no course-builder UI; content edits are manifest edits.
//
// Usage: npm run seed:course -- prisma/courses/corporate-financial-education.json
//
// Idempotent AND progress-preserving: modules and lessons are upserted by
// their (parent, position) unique keys, so re-running after a content edit
// updates rows in place instead of recreating them — which would cascade-
// delete members' LessonProgress. Rows beyond the manifest's counts are
// removed (their progress is genuinely gone, as the lesson no longer exists).
// =============================================================================

interface ManifestCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ManifestLesson {
  title: string;
  /** Inclusive slide range [first, last] in the source deck, 1-based. */
  slides: [number, number];
  body?: string;
  videoId?: string;
  checks?: ManifestCheck[];
}

interface ManifestModule {
  title: string;
  lessons: ManifestLesson[];
}

interface CourseManifest {
  slug: string;
  title: string;
  description?: string;
  isPublished?: boolean;
  /** Object-key pattern appended to R2_PUBLIC_URL; {n} = zero-padded slide number. */
  slideUrlPattern: string;
  modules: ManifestModule[];
}

function slideUrls(manifest: CourseManifest, range: [number, number]): string[] {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  const urls: string[] = [];
  for (let n = range[0]; n <= range[1]; n++) {
    const key = manifest.slideUrlPattern.replace("{n}", String(n).padStart(3, "0"));
    urls.push(`${base}/${key}`);
  }
  return urls;
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: npm run seed:course -- <manifest.json>");
    process.exit(1);
  }

  const manifest: CourseManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const course = await prisma.course.upsert({
    where: { slug: manifest.slug },
    update: {
      title: manifest.title,
      description: manifest.description ?? null,
      isPublished: manifest.isPublished ?? false,
    },
    create: {
      slug: manifest.slug,
      title: manifest.title,
      description: manifest.description ?? null,
      isPublished: manifest.isPublished ?? false,
    },
  });

  for (const [mi, mod] of manifest.modules.entries()) {
    const courseModule = await prisma.courseModule.upsert({
      where: { courseId_position: { courseId: course.id, position: mi } },
      update: { title: mod.title },
      create: { courseId: course.id, title: mod.title, position: mi },
    });

    for (const [li, lesson] of mod.lessons.entries()) {
      const urls = slideUrls(manifest, lesson.slides);
      const data = {
        title: lesson.title,
        body: lesson.body ?? null,
        slideUrls: urls,
        videoId: lesson.videoId ?? null,
      };
      const row = await prisma.lesson.upsert({
        where: { moduleId_position: { moduleId: courseModule.id, position: li } },
        update: data,
        create: { ...data, moduleId: courseModule.id, position: li },
      });

      const checks = lesson.checks ?? [];
      for (const [ci, check] of checks.entries()) {
        const checkData = {
          question: check.question,
          options: check.options,
          correctIndex: check.correctIndex,
          explanation: check.explanation ?? null,
        };
        await prisma.knowledgeCheck.upsert({
          where: { lessonId_position: { lessonId: row.id, position: ci } },
          update: checkData,
          create: { ...checkData, lessonId: row.id, position: ci },
        });
      }
      await prisma.knowledgeCheck.deleteMany({
        where: { lessonId: row.id, position: { gte: checks.length } },
      });
    }

    await prisma.lesson.deleteMany({
      where: { moduleId: courseModule.id, position: { gte: mod.lessons.length } },
    });
  }

  await prisma.courseModule.deleteMany({
    where: { courseId: course.id, position: { gte: manifest.modules.length } },
  });

  const lessonCount = manifest.modules.reduce((n, m) => n + m.lessons.length, 0);
  console.log(
    `Seeded course "${manifest.title}" (${manifest.slug}): ` +
      `${manifest.modules.length} modules, ${lessonCount} lessons, published=${manifest.isPublished ?? false}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
