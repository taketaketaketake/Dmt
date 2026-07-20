import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLesson, useUpdateLessonProgress } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import { LessonBody } from "../components/course/LessonBody";
import styles from "./Lesson.module.css";

export function LessonPage() {
  const { slug = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { data: lesson, isPending, error } = useLesson(slug, lessonId);
  const updateProgress = useUpdateLessonProgress(slug);
  usePageTitle(lesson?.title);

  const [slide, setSlide] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [checksAnswered, setChecksAnswered] = useState(0);
  // Server state is applied once per lesson load; after that the player owns
  // slide/completed locally and pushes changes up.
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (lesson && initializedFor.current !== lesson.id) {
      initializedFor.current = lesson.id;
      setSlide(Math.min(lesson.lastSlide, Math.max(0, lesson.slideUrls.length - 1)));
      setCompleted(lesson.completed);
      setChecksAnswered(0);
    }
  }, [lesson]);

  const hasBody = Boolean(lesson?.body);
  const slideCount = lesson?.slideUrls.length ?? 0;

  const goTo = useCallback(
    (next: number) => {
      if (!lesson || next < 0 || next >= slideCount) return;
      setSlide(next);
      updateProgress.mutate({ lessonId: lesson.id, lastSlide: next });
    },
    [lesson, slideCount, updateProgress]
  );

  // Arrow-key navigation between slides (slide-player mode only — in native
  // mode the arrows would fight normal page scrolling/reading).
  useEffect(() => {
    if (hasBody) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(slide + 1);
      if (e.key === "ArrowLeft") goTo(slide - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, goTo, hasBody]);

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Lesson not found"}</p>
      </div>
    );
  }

  // Answering every check (right or wrong) soft-gates completion (ADR-010).
  const checksRemaining = lesson.checks.length > 0 && checksAnswered < lesson.checks.length;

  const markComplete = () => {
    if (checksRemaining) return;
    setCompleted(true);
    updateProgress.mutate({ lessonId: lesson.id, completed: true });
  };

  const completeAndContinue = () => {
    if (checksRemaining) return;
    markComplete();
    if (lesson.next) {
      navigate(`/courses/${slug}/lessons/${lesson.next.id}`);
    }
  };

  const onLastSlide = slide >= slideCount - 1;

  const slidePlayer = slideCount > 0 && (
    <div className={styles.player}>
      <img
        className={styles.slide}
        src={lesson.slideUrls[slide]}
        alt={`${lesson.title} — slide ${slide + 1} of ${slideCount}`}
      />
      {/* Preload the next slide so advancing feels instant */}
      {slide + 1 < slideCount && (
        <link rel="preload" as="image" href={lesson.slideUrls[slide + 1]} />
      )}

      <div className={styles.playerControls}>
        <button
          type="button"
          className={styles.slideButton}
          onClick={() => goTo(slide - 1)}
          disabled={slide === 0}
        >
          ← Back
        </button>
        <span className={styles.slideCounter}>
          {slide + 1} / {slideCount}
        </span>
        <button
          type="button"
          className={styles.slideButton}
          onClick={() => goTo(slide + 1)}
          disabled={onLastSlide}
        >
          Next →
        </button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <header className={styles.header}>
        <Link to={`/courses/${slug}`} className={styles.backLink}>
          ← Course outline
        </Link>
        <p className={styles.moduleTitle}>{lesson.moduleTitle}</p>
        <h1 className={styles.title}>{lesson.title}</h1>
      </header>

      {lesson.audioUrl && (
        <div className={styles.audioWrap}>
          <p className={styles.audioLabel}>Listen to this lesson</p>
          <audio className={styles.audio} controls preload="none" src={lesson.audioUrl} />
        </div>
      )}

      {lesson.videoId && (
        <div className={styles.videoWrap}>
          <iframe
            className={styles.video}
            src={`https://iframe.videodelivery.net/${lesson.videoId}`}
            title={lesson.title}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {hasBody ? (
        <>
          <LessonBody
            body={lesson.body!}
            checks={lesson.checks}
            onChecksAnsweredChange={setChecksAnswered}
          />
          {slideCount > 0 && (
            <details className={styles.slidesDetails}>
              <summary className={styles.slidesSummary}>View original slides</summary>
              {slidePlayer}
            </details>
          )}
        </>
      ) : (
        slidePlayer
      )}

      <footer className={styles.footer}>
        {lesson.prev ? (
          <Link to={`/courses/${slug}/lessons/${lesson.prev.id}`} className={styles.navLink}>
            ← {lesson.prev.title}
          </Link>
        ) : (
          <span />
        )}

        {completed ? (
          <span className={styles.completedBadge}>✓ Completed</span>
        ) : (
          <span className={styles.completeGroup}>
            <button
              type="button"
              className={styles.completeButton}
              onClick={lesson.next ? completeAndContinue : markComplete}
              disabled={checksRemaining}
            >
              {lesson.next ? "Mark complete & continue" : "Mark complete"}
            </button>
            {checksRemaining && (
              <span className={styles.completeHint}>
                Answer the knowledge checks first
              </span>
            )}
          </span>
        )}

        {lesson.next ? (
          <Link to={`/courses/${slug}/lessons/${lesson.next.id}`} className={styles.navLinkNext}>
            {lesson.next.title} →
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </div>
  );
}
