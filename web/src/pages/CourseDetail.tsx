import { Link, useParams } from "react-router-dom";
import { useCourse } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./CourseDetail.module.css";

export function CourseDetailPage() {
  const { slug = "" } = useParams();
  const { data: course, isPending, error } = useCourse(slug);
  usePageTitle(course?.title);

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Course not found"}</p>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const completedCount = allLessons.filter((l) => l.completed).length;
  const pct =
    allLessons.length === 0 ? 0 : Math.round((completedCount / allLessons.length) * 100);
  const started = completedCount > 0;

  return (
    <div className="container">
      <header className={styles.header}>
        <Link to="/courses" className={styles.backLink}>
          ← Courses
        </Link>
        <h1 className={styles.title}>{course.title}</h1>
        {course.description && <p className={styles.description}>{course.description}</p>}

        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressLabel}>
            {completedCount} of {allLessons.length} lessons complete
          </span>
        </div>

        {course.resumeLessonId && (
          <Link
            to={`/courses/${course.slug}/lessons/${course.resumeLessonId}`}
            className={styles.resumeButton}
          >
            {started ? "Continue course" : "Start course"}
          </Link>
        )}
      </header>

      <div className={styles.modules}>
        {course.modules.map((mod) => (
          <section key={mod.id} className={styles.module}>
            <h2 className={styles.moduleTitle}>{mod.title}</h2>
            <ol className={styles.lessonList}>
              {mod.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    to={`/courses/${course.slug}/lessons/${lesson.id}`}
                    className={styles.lessonRow}
                  >
                    <span
                      className={
                        lesson.completed ? styles.lessonCheckDone : styles.lessonCheck
                      }
                      aria-hidden="true"
                    >
                      {lesson.completed ? "✓" : ""}
                    </span>
                    <span className={styles.lessonTitle}>{lesson.title}</span>
                    <span className={styles.lessonMeta}>
                      {lesson.slideCount} slide{lesson.slideCount !== 1 ? "s" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            {mod.quiz && (
              <Link
                to={`/courses/${course.slug}/modules/${mod.id}/quiz`}
                className={styles.quizRow}
              >
                <span
                  className={
                    mod.quiz.status === "passed"
                      ? styles.quizBadgePassed
                      : mod.quiz.status === "failed"
                        ? styles.quizBadgeFailed
                        : styles.quizBadge
                  }
                  aria-hidden="true"
                >
                  {mod.quiz.status === "passed" ? "✓" : mod.quiz.status === "failed" ? "✗" : "?"}
                </span>
                <span className={styles.quizTitle}>Module quiz</span>
                <span className={styles.quizMeta}>
                  {mod.quiz.status === "passed"
                    ? "Passed"
                    : mod.quiz.status === "failed"
                      ? "Not passed"
                      : `${mod.quiz.questionCount} questions · ${mod.quiz.maxAttempts - mod.quiz.attemptsUsed} attempts left`}
                </span>
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
