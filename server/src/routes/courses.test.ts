import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  buildTestApp,
  prismaMock,
  resetPrismaMock,
  mockSession,
  authCookie,
} from "../test/helpers.js";

// =============================================================================
// FIXTURES
// =============================================================================

const slides = (n: number) =>
  Array.from({ length: n }, (_, i) => `https://cdn.example.com/slide-${i + 1}.png`);

function mockCourseOutline() {
  return {
    id: "course-1",
    slug: "test-course",
    title: "Test Course",
    description: "A course",
    isPublished: true,
    modules: [
      {
        id: "mod-1",
        title: "Module 1",
        position: 0,
        lessons: [
          { id: "les-1", title: "Lesson One", position: 0, slideUrls: slides(3) },
          { id: "les-2", title: "Lesson Two", position: 1, slideUrls: slides(2) },
        ],
      },
    ],
  };
}

function authAs() {
  prismaMock.session.findUnique.mockResolvedValue(mockSession() as never);
}

describe("Courses Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetPrismaMock();
  });

  describe("GET /api/courses", () => {
    it("requires authentication", async () => {
      const response = await app.inject({ method: "GET", url: "/api/courses" });
      expect(response.statusCode).toBe(401);
    });

    it("lists published courses with progress counts", async () => {
      authAs();
      prismaMock.course.findMany.mockResolvedValue([
        {
          id: "course-1",
          slug: "test-course",
          title: "Test Course",
          description: null,
          modules: [{ lessons: [{ id: "les-1" }, { id: "les-2" }] }],
        },
      ] as never);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: "les-1" },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const { courses } = response.json();
      expect(courses).toHaveLength(1);
      expect(courses[0]).toMatchObject({
        slug: "test-course",
        lessonCount: 2,
        completedCount: 1,
      });
    });
  });

  describe("GET /api/courses/public", () => {
    it("returns published curriculum metadata without authentication", async () => {
      prismaMock.course.findMany.mockResolvedValue([
        {
          slug: "founder-series",
          title: "Founder Basics",
          description: "Start here",
          modules: [
            {
              title: "Module 1",
              lessons: [{ title: "Lesson One" }, { title: "Lesson Two" }],
            },
          ],
        },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/public",
      });

      expect(response.statusCode).toBe(200);
      const { courses } = response.json();
      // Exact shape: titles and counts only — no ids, bodies, or media URLs
      expect(courses).toEqual([
        {
          slug: "founder-series",
          title: "Founder Basics",
          description: "Start here",
          lessonCount: 2,
          modules: [
            {
              title: "Module 1",
              lessons: [{ title: "Lesson One" }, { title: "Lesson Two" }],
            },
          ],
        },
      ]);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } })
      );
    });

    it("returns an empty list when nothing is published", async () => {
      prismaMock.course.findMany.mockResolvedValue([] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/public",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().courses).toEqual([]);
    });
  });

  describe("GET /api/courses/:slug", () => {
    it("404s for an unknown course", async () => {
      authAs();
      prismaMock.course.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/nope",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });

    it("404s for an unpublished course", async () => {
      authAs();
      prismaMock.course.findUnique.mockResolvedValue({
        ...mockCourseOutline(),
        isPublished: false,
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/test-course",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns the outline with per-lesson progress and resume target", async () => {
      authAs();
      prismaMock.course.findUnique.mockResolvedValue(mockCourseOutline() as never);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: "les-1", lastSlide: 2, completedAt: new Date() },
      ] as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/test-course",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const { course } = response.json();
      // les-1 complete, so the first incomplete lesson is les-2
      expect(course.resumeLessonId).toBe("les-2");
      const lessons = course.modules[0].lessons;
      expect(lessons[0]).toMatchObject({ id: "les-1", completed: true, slideCount: 3 });
      expect(lessons[1]).toMatchObject({ id: "les-2", completed: false, lastSlide: 0 });
    });
  });

  describe("GET /api/courses/:slug/lessons/:lessonId", () => {
    function mockLessonDetail() {
      return {
        id: "les-1",
        title: "Lesson One",
        body: "## Section\n\n- point",
        slideUrls: slides(3),
        audioUrl: "https://cdn.example.com/narration.m4a",
        videoId: null,
        checks: [
          {
            id: "chk-1",
            question: "Q?",
            options: ["a", "b"],
            correctIndex: 1,
            explanation: null,
          },
        ],
        module: {
          id: "mod-1",
          title: "Module 1",
          course: {
            slug: "test-course",
            isPublished: true,
            modules: [
              {
                lessons: [
                  { id: "les-1", title: "Lesson One" },
                  { id: "les-2", title: "Lesson Two" },
                ],
              },
            ],
          },
        },
      };
    }

    it("404s when the lesson belongs to a different course slug", async () => {
      authAs();
      prismaMock.lesson.findUnique.mockResolvedValue(mockLessonDetail() as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/other-course/lessons/les-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns lesson content with neighbors and progress", async () => {
      authAs();
      prismaMock.lesson.findUnique.mockResolvedValue(mockLessonDetail() as never);
      prismaMock.lessonProgress.findUnique.mockResolvedValue({
        lastSlide: 1,
        completedAt: null,
      } as never);

      const response = await app.inject({
        method: "GET",
        url: "/api/courses/test-course/lessons/les-1",
        headers: { cookie: authCookie() },
      });

      expect(response.statusCode).toBe(200);
      const { lesson } = response.json();
      expect(lesson).toMatchObject({
        id: "les-1",
        moduleTitle: "Module 1",
        body: "## Section\n\n- point",
        audioUrl: "https://cdn.example.com/narration.m4a",
        prev: null,
        next: { id: "les-2", title: "Lesson Two" },
        lastSlide: 1,
        completed: false,
      });
      expect(lesson.slideUrls).toHaveLength(3);
      expect(lesson.checks).toHaveLength(1);
      expect(lesson.checks[0]).toMatchObject({ question: "Q?", correctIndex: 1 });
    });
  });

  describe("PUT /api/courses/lessons/:lessonId/progress", () => {
    function mockLessonForProgress() {
      return {
        slideUrls: slides(3),
        module: { course: { isPublished: true } },
      };
    }

    it("rejects an empty body", async () => {
      authAs();

      const response = await app.inject({
        method: "PUT",
        url: "/api/courses/lessons/les-1/progress",
        headers: { cookie: authCookie() },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects a negative lastSlide", async () => {
      authAs();

      const response = await app.inject({
        method: "PUT",
        url: "/api/courses/lessons/les-1/progress",
        headers: { cookie: authCookie() },
        payload: { lastSlide: -1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("404s for an unknown lesson", async () => {
      authAs();
      prismaMock.lesson.findUnique.mockResolvedValue(null as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/courses/lessons/nope/progress",
        headers: { cookie: authCookie() },
        payload: { lastSlide: 1 },
      });

      expect(response.statusCode).toBe(404);
    });

    it("upserts progress and clamps lastSlide to the slide count", async () => {
      authAs();
      prismaMock.lesson.findUnique.mockResolvedValue(mockLessonForProgress() as never);
      prismaMock.lessonProgress.upsert.mockResolvedValue({
        lessonId: "les-1",
        lastSlide: 2,
        completedAt: null,
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/courses/lessons/les-1/progress",
        headers: { cookie: authCookie() },
        payload: { lastSlide: 99 },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ lastSlide: 2 }), // clamped to max index
        })
      );
    });

    it("marks a lesson complete", async () => {
      authAs();
      prismaMock.lesson.findUnique.mockResolvedValue(mockLessonForProgress() as never);
      prismaMock.lessonProgress.upsert.mockResolvedValue({
        lessonId: "les-1",
        lastSlide: 0,
        completedAt: new Date(),
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: "/api/courses/lessons/les-1/progress",
        headers: { cookie: authCookie() },
        payload: { completed: true },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().progress.completedAt).toBeTruthy();
      expect(prismaMock.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ completedAt: expect.any(Date) }),
        })
      );
    });
  });
});
