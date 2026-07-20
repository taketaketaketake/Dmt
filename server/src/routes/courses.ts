import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authAndApproved } from "../middleware/auth.js";

// =============================================================================
// TYPES
// =============================================================================

interface SlugParams {
  slug: string;
}

interface LessonParams {
  lessonId: string;
}

interface ProgressBody {
  lastSlide?: number;
  completed?: boolean;
}

// =============================================================================
// COURSES ROUTES (LMS-lite, ADR-010)
// Members-only course delivery: published courses, lesson content, and
// per-user progress. No authoring endpoints — courses are seeded.
// =============================================================================

export async function coursesRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/courses
  // List published courses with the member's progress summary
  // ---------------------------------------------------------------------------
  app.get("/", { preHandler: authAndApproved() }, async (request, reply) => {
    const user = request.user!;

    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        modules: {
          select: { lessons: { select: { id: true } } },
        },
      },
    });

    const lessonIds = courses.flatMap((c) =>
      c.modules.flatMap((m) => m.lessons.map((l) => l.id))
    );

    const completed = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: lessonIds },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    });
    const completedIds = new Set(completed.map((p) => p.lessonId));

    return reply.status(200).send({
      courses: courses.map((c) => {
        const ids = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          description: c.description,
          lessonCount: ids.length,
          completedCount: ids.filter((id) => completedIds.has(id)).length,
        };
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/courses/:slug
  // Course outline: modules and lessons with the member's per-lesson progress
  // ---------------------------------------------------------------------------
  app.get<{ Params: SlugParams }>(
    "/:slug",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { slug } = request.params;

      const course = await prisma.course.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          isPublished: true,
          modules: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              position: true,
              lessons: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  title: true,
                  position: true,
                  slideUrls: true,
                },
              },
            },
          },
        },
      });

      if (!course || !course.isPublished) {
        return reply.status(404).send({ error: "Course not found" });
      }

      const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const progress = await prisma.lessonProgress.findMany({
        where: { userId: user.id, lessonId: { in: lessonIds } },
        select: { lessonId: true, lastSlide: true, completedAt: true },
      });
      const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));

      // Resume target: first lesson that isn't completed, in course order.
      const firstIncomplete = course.modules
        .flatMap((m) => m.lessons)
        .find((l) => !progressByLesson.get(l.id)?.completedAt);

      return reply.status(200).send({
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          description: course.description,
          resumeLessonId: firstIncomplete?.id ?? null,
          modules: course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            position: m.position,
            lessons: m.lessons.map((l) => {
              const p = progressByLesson.get(l.id);
              return {
                id: l.id,
                title: l.title,
                position: l.position,
                slideCount: l.slideUrls.length,
                completed: Boolean(p?.completedAt),
                lastSlide: p?.lastSlide ?? 0,
              };
            }),
          })),
        },
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/courses/:slug/lessons/:lessonId
  // Lesson content for the player: slides, body, neighbors, progress
  // ---------------------------------------------------------------------------
  app.get<{ Params: SlugParams & LessonParams }>(
    "/:slug/lessons/:lessonId",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { slug, lessonId } = request.params;

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
          id: true,
          title: true,
          body: true,
          slideUrls: true,
          audioUrl: true,
          videoId: true,
          // Checks are ungraded learning aids (ADR-010), so shipping
          // correctIndex to the client for instant feedback is deliberate.
          checks: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              question: true,
              options: true,
              correctIndex: true,
              explanation: true,
            },
          },
          module: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  slug: true,
                  isPublished: true,
                  modules: {
                    orderBy: { position: "asc" },
                    select: {
                      lessons: {
                        orderBy: { position: "asc" },
                        select: { id: true, title: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (
        !lesson ||
        lesson.module.course.slug !== slug ||
        !lesson.module.course.isPublished
      ) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      // Prev/next across module boundaries, in course order.
      const ordered = lesson.module.course.modules.flatMap((m) => m.lessons);
      const index = ordered.findIndex((l) => l.id === lesson.id);
      const prev = index > 0 ? ordered[index - 1] : null;
      const next = index < ordered.length - 1 ? ordered[index + 1] : null;

      const progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        select: { lastSlide: true, completedAt: true },
      });

      return reply.status(200).send({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          body: lesson.body,
          slideUrls: lesson.slideUrls,
          audioUrl: lesson.audioUrl,
          videoId: lesson.videoId,
          checks: lesson.checks,
          moduleTitle: lesson.module.title,
          prev,
          next,
          lastSlide: progress?.lastSlide ?? 0,
          completed: Boolean(progress?.completedAt),
        },
      });
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/courses/lessons/:lessonId/progress
  // Upsert the member's progress: resume position and/or completion
  // ---------------------------------------------------------------------------
  app.put<{ Params: LessonParams; Body: ProgressBody }>(
    "/lessons/:lessonId/progress",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { lessonId } = request.params;
      const { lastSlide, completed } = request.body ?? {};

      if (lastSlide === undefined && completed === undefined) {
        return reply.status(400).send({ error: "Nothing to update" });
      }
      if (
        lastSlide !== undefined &&
        (!Number.isInteger(lastSlide) || lastSlide < 0)
      ) {
        return reply.status(400).send({ error: "lastSlide must be a non-negative integer" });
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
          slideUrls: true,
          module: { select: { course: { select: { isPublished: true } } } },
        },
      });

      if (!lesson || !lesson.module.course.isPublished) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      const maxSlide = Math.max(0, lesson.slideUrls.length - 1);
      const clampedSlide =
        lastSlide === undefined ? undefined : Math.min(lastSlide, maxSlide);
      const completedAt =
        completed === undefined ? undefined : completed ? new Date() : null;

      const progress = await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        update: {
          ...(clampedSlide !== undefined && { lastSlide: clampedSlide }),
          ...(completedAt !== undefined && { completedAt }),
        },
        create: {
          userId: user.id,
          lessonId,
          lastSlide: clampedSlide ?? 0,
          completedAt: completedAt ?? null,
        },
        select: { lessonId: true, lastSlide: true, completedAt: true },
      });

      return reply.status(200).send({ progress });
    }
  );
}
