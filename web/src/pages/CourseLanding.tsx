import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts";
import { usePublicCourses } from "../hooks/queries";
import { useBranding } from "../hooks/useBranding";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./CourseLanding.module.css";

// Public marketing page for the deployment's course offering. Fully
// branding-driven (name/tagline from GET /api/tenant), so the same component
// serves every client instance. The CTA reuses the magic-link endpoint:
// submitting an email creates a pending account and sends a confirmation
// link, but course access stays gated behind manual approval (and, later,
// payment) — so the copy promises a review, not instant access.
export function CourseLandingPage() {
  usePageTitle();
  const branding = useBranding();
  const { login, isAuthenticated } = useAuth();
  const { data: courses = [], isPending, error } = usePublicCourses();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await login(email);

    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setSubmitError(result.message || "Failed to send confirmation link");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>{branding.name}</h1>
          {branding.tagline && (
            <p className={styles.heroLede}>{branding.tagline}</p>
          )}
          <a href="#request-access" className={styles.heroCta}>
            Request Access
          </a>
        </header>

        <section className={styles.section} aria-labelledby="curriculum-heading">
          <h2 id="curriculum-heading" className={styles.sectionTitle}>
            The curriculum
          </h2>
          {isPending ? (
            <p className={styles.sectionNote}>Loading curriculum…</p>
          ) : error || courses.length === 0 ? (
            <p className={styles.sectionNote}>
              Full curriculum details coming soon — request access below to be
              first in line.
            </p>
          ) : (
            <div className={styles.courseList}>
              {courses.map((course) => (
                <article key={course.slug} className={styles.courseCard}>
                  <div className={styles.courseHeader}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <span className={styles.courseMeta}>
                      {course.lessonCount}{" "}
                      {course.lessonCount === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>
                  {course.description && (
                    <p className={styles.courseDescription}>{course.description}</p>
                  )}
                  <ol className={styles.moduleList}>
                    {course.modules.map((mod, mi) => (
                      <li key={mi} className={styles.module}>
                        <span className={styles.moduleTitle}>{mod.title}</span>
                        <ul className={styles.lessonList}>
                          {mod.lessons.map((lesson, li) => (
                            <li key={li} className={styles.lesson}>
                              {lesson.title}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="how-heading">
          <h2 id="how-heading" className={styles.sectionTitle}>
            How it works
          </h2>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 className={styles.stepTitle}>Request access</h3>
                <p className={styles.stepBody}>
                  Enter your email below. We&rsquo;ll send you a secure link to
                  confirm your address — no password needed.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3 className={styles.stepTitle}>We review your request</h3>
                <p className={styles.stepBody}>
                  Every request is reviewed personally, usually within 1–2
                  days. You&rsquo;ll be notified as soon as you&rsquo;re in.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 className={styles.stepTitle}>Learn at your own pace</h3>
                <p className={styles.stepBody}>
                  Work through narrated lessons on your schedule. Your progress
                  is saved automatically, so you can pick up where you left off.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section
          id="request-access"
          className={styles.requestSection}
          aria-labelledby="request-heading"
        >
          <div className={styles.card}>
            {isAuthenticated ? (
              <>
                <h2 id="request-heading" className={styles.cardTitle}>
                  You&rsquo;re already signed in
                </h2>
                <p className={styles.cardDescription}>
                  Head to your courses to continue where you left off.
                </p>
                <Link to="/courses" className={styles.cardCta}>
                  Go to courses
                </Link>
              </>
            ) : submitted ? (
              <>
                <h2 id="request-heading" className={styles.cardTitle}>
                  Check your email
                </h2>
                <p className={styles.cardDescription}>
                  We sent a confirmation link to <strong>{email}</strong>.
                  Click it to finish your request — course access unlocks once
                  your request is approved, usually within 1–2 days.
                </p>
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() => {
                    setSubmitted(false);
                    setSubmitError(null);
                  }}
                >
                  Use a different email
                </button>
              </>
            ) : (
              <>
                <h2 id="request-heading" className={styles.cardTitle}>
                  Request access
                </h2>
                <p className={styles.cardDescription}>
                  Access to the series is granted by request. Enter your email
                  and we&rsquo;ll take it from there.
                </p>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                      className={styles.input}
                    />
                  </label>

                  {submitError && <p className={styles.error}>{submitError}</p>}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending…" : "Request Access"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Already a member?{" "}
            <Link to="/login" className={styles.footerLink}>
              Sign in
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
