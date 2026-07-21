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

interface ModuleParams {
  moduleId: string;
}

interface ProgressBody {
  lastSlide?: number;
  completed?: boolean;
}

interface QuizAttemptBody {
  answers?: number[];
}

// Module quizzes: two attempts, pass at >=70%. A second miss marks the module
// "failed" and the member simply moves on — outcomes are recorded, not gates.
const QUIZ_MAX_ATTEMPTS = 2;
const QUIZ_PASS_RATIO = 0.7;

// =============================================================================
// COURSES ROUTES (LMS-lite, ADR-010)
// Members-only course delivery: published courses, lesson content, and
// per-user progress. No authoring endpoints — courses are seeded.
// =============================================================================

export async function coursesRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /api/courses/public
  // Unauthenticated curriculum preview for the marketing landing page.
  // Metadata only — course/module/lesson titles and counts. Lesson bodies,
  // media URLs, and ids stay behind authAndApproved().
  // ---------------------------------------------------------------------------
  app.get("/public", async (_request, reply) => {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "asc" },
      select: {
        slug: true,
        title: true,
        description: true,
        modules: {
          orderBy: { position: "asc" },
          select: {
            title: true,
            lessons: {
              orderBy: { position: "asc" },
              select: { title: true },
            },
          },
        },
      },
    });

    return reply.status(200).send({
      courses: courses.map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        lessonCount: c.modules.reduce((n, m) => n + m.lessons.length, 0),
        modules: c.modules.map((m) => ({
          title: m.title,
          lessons: m.lessons.map((l) => ({ title: l.title })),
        })),
      })),
    });
  });

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
              _count: { select: { quizQuestions: true } },
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

      // Per-module quiz state for the outline badges
      const quizModuleIds = course.modules
        .filter((m) => m._count.quizQuestions > 0)
        .map((m) => m.id);
      const quizAttempts = quizModuleIds.length
        ? await prisma.quizAttempt.findMany({
            where: { userId: user.id, moduleId: { in: quizModuleIds } },
            select: { moduleId: true, passed: true },
          })
        : [];
      const quizStateByModule = new Map<
        string,
        { attemptsUsed: number; passed: boolean }
      >();
      for (const a of quizAttempts) {
        const s = quizStateByModule.get(a.moduleId) ?? {
          attemptsUsed: 0,
          passed: false,
        };
        s.attemptsUsed += 1;
        s.passed = s.passed || a.passed;
        quizStateByModule.set(a.moduleId, s);
      }

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
            quiz:
              m._count.quizQuestions > 0
                ? (() => {
                    const s = quizStateByModule.get(m.id);
                    return {
                      questionCount: m._count.quizQuestions,
                      attemptsUsed: s?.attemptsUsed ?? 0,
                      maxAttempts: QUIZ_MAX_ATTEMPTS,
                      status: s?.passed
                        ? "passed"
                        : (s?.attemptsUsed ?? 0) >= QUIZ_MAX_ATTEMPTS
                          ? "failed"
                          : "pending",
                    };
                  })()
                : null,
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
              _count: { select: { quizQuestions: true } },
              course: {
                select: {
                  slug: true,
                  isPublished: true,
                  modules: {
                    orderBy: { position: "asc" },
                    select: {
                      id: true,
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

      // If this is the last lesson of a module with a quiz, surface the quiz
      // so the finish screen routes members into it instead of past it.
      const ownModule = lesson.module.course.modules.find(
        (m) => m.id === lesson.module.id
      );
      const isLastInModule =
        ownModule?.lessons[ownModule.lessons.length - 1]?.id === lesson.id;
      let moduleQuiz: {
        moduleId: string;
        questionCount: number;
        status: "passed" | "failed" | "pending";
      } | null = null;
      if (isLastInModule && lesson.module._count.quizQuestions > 0) {
        const attempts = await prisma.quizAttempt.findMany({
          where: { userId: user.id, moduleId: lesson.module.id },
          select: { passed: true },
        });
        moduleQuiz = {
          moduleId: lesson.module.id,
          questionCount: lesson.module._count.quizQuestions,
          status: attempts.some((a) => a.passed)
            ? "passed"
            : attempts.length >= QUIZ_MAX_ATTEMPTS
              ? "failed"
              : "pending",
        };
      }

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
          moduleQuiz,
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
          body: true,
          module: { select: { course: { select: { isPublished: true } } } },
        },
      });

      if (!lesson || !lesson.module.course.isPublished) {
        return reply.status(404).send({ error: "Lesson not found" });
      }

      // Native-deck lessons (body set) have step counts derived client-side
      // from the markdown sections, so clamp to a sanity cap rather than the
      // image count; image-only lessons clamp to their slide count.
      const maxSlide = lesson.body
        ? 499
        : Math.max(0, lesson.slideUrls.length - 1);
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

  // ---------------------------------------------------------------------------
  // GET /api/courses/:slug/modules/:moduleId/quiz
  // The module quiz + the member's attempt state. Correct answers and
  // explanations are only included once the quiz is finished (passed, or out
  // of attempts) — otherwise attempt two would be an answer key.
  // ---------------------------------------------------------------------------
  app.get<{ Params: SlugParams & ModuleParams }>(
    "/:slug/modules/:moduleId/quiz",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { slug, moduleId } = request.params;

      const courseModule = await prisma.courseModule.findUnique({
        where: { id: moduleId },
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, isPublished: true } },
          quizQuestions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              question: true,
              options: true,
              correctIndex: true,
              explanation: true,
            },
          },
        },
      });

      if (
        !courseModule ||
        courseModule.course.slug !== slug ||
        !courseModule.course.isPublished ||
        courseModule.quizQuestions.length === 0
      ) {
        return reply.status(404).send({ error: "Quiz not found" });
      }

      const attempts = await prisma.quizAttempt.findMany({
        where: { userId: user.id, moduleId },
        orderBy: { createdAt: "asc" },
        select: { score: true, total: true, passed: true, createdAt: true },
      });

      const passed = attempts.some((a) => a.passed);
      const finished = passed || attempts.length >= QUIZ_MAX_ATTEMPTS;
      const status = passed
        ? "passed"
        : attempts.length >= QUIZ_MAX_ATTEMPTS
          ? "failed"
          : "pending";

      return reply.status(200).send({
        quiz: {
          moduleId: courseModule.id,
          moduleTitle: courseModule.title,
          status,
          attemptsUsed: attempts.length,
          maxAttempts: QUIZ_MAX_ATTEMPTS,
          attempts,
          questions: courseModule.quizQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            ...(finished
              ? { correctIndex: q.correctIndex, explanation: q.explanation }
              : {}),
          })),
        },
      });
    }
  );

  // ---------------------------------------------------------------------------
  // POST /api/courses/:slug/modules/:moduleId/quiz/attempts
  // Grade a submission server-side and record the attempt.
  // ---------------------------------------------------------------------------
  app.post<{ Params: SlugParams & ModuleParams; Body: QuizAttemptBody }>(
    "/:slug/modules/:moduleId/quiz/attempts",
    { preHandler: authAndApproved() },
    async (request, reply) => {
      const user = request.user!;
      const { slug, moduleId } = request.params;
      const { answers } = request.body ?? {};

      const courseModule = await prisma.courseModule.findUnique({
        where: { id: moduleId },
        select: {
          course: { select: { slug: true, isPublished: true } },
          quizQuestions: {
            orderBy: { position: "asc" },
            select: { correctIndex: true, explanation: true },
          },
        },
      });

      if (
        !courseModule ||
        courseModule.course.slug !== slug ||
        !courseModule.course.isPublished ||
        courseModule.quizQuestions.length === 0
      ) {
        return reply.status(404).send({ error: "Quiz not found" });
      }

      const questions = courseModule.quizQuestions;
      if (
        !Array.isArray(answers) ||
        answers.length !== questions.length ||
        answers.some((a) => !Number.isInteger(a) || a < 0)
      ) {
        return reply
          .status(400)
          .send({ error: `Expected ${questions.length} answers` });
      }

      const prior = await prisma.quizAttempt.findMany({
        where: { userId: user.id, moduleId },
        select: { passed: true },
      });
      if (prior.some((a) => a.passed)) {
        return reply.status(409).send({ error: "Quiz already passed" });
      }
      if (prior.length >= QUIZ_MAX_ATTEMPTS) {
        return reply.status(409).send({ error: "No attempts remaining" });
      }

      const results = questions.map((q, i) => ({
        correct: answers[i] === q.correctIndex,
      }));
      const score = results.filter((r) => r.correct).length;
      const total = questions.length;
      const passed = score >= Math.ceil(total * QUIZ_PASS_RATIO);
      const finished = passed || prior.length + 1 >= QUIZ_MAX_ATTEMPTS;

      await prisma.quizAttempt.create({
        data: { userId: user.id, moduleId, answers, score, total, passed },
      });

      return reply.status(201).send({
        attempt: { attemptNumber: prior.length + 1, score, total, passed },
        results,
        status: passed ? "passed" : finished ? "failed" : "pending",
        finished,
        // Reveal the answer key only when the quiz is over
        ...(finished
          ? {
              answerKey: questions.map((q) => ({
                correctIndex: q.correctIndex,
                explanation: q.explanation,
              })),
            }
          : {}),
      });
    }
  );
}
