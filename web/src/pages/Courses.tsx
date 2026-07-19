import { Link } from "react-router-dom";
import { useCoursesList } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Courses.module.css";

export function CoursesPage() {
  usePageTitle("Courses");
  const { data: courses = [], isPending, error } = useCoursesList();

  if (isPending) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Courses</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Courses</h1>
        </header>
        <p className={styles.message}>{error.message || "Failed to load courses"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>Courses</h1>
        <p className={styles.subtitle}>Work through at your own pace — your progress is saved.</p>
      </header>

      {courses.length === 0 ? (
        <p className={styles.message}>No courses available yet.</p>
      ) : (
        <div className={styles.list}>
          {courses.map((course) => {
            const pct =
              course.lessonCount === 0
                ? 0
                : Math.round((course.completedCount / course.lessonCount) * 100);
            return (
              <Link key={course.id} to={`/courses/${course.slug}`} className={styles.card}>
                <div className={styles.cardMain}>
                  <h2 className={styles.cardTitle}>{course.title}</h2>
                  {course.description && (
                    <p className={styles.cardDescription}>{course.description}</p>
                  )}
                  <div className={styles.progressRow}>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.progressLabel}>
                      {course.completedCount} of {course.lessonCount} lessons
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
