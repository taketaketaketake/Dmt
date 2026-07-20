import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useLesson, useUpdateLessonProgress } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import { LessonDeck } from "../components/course/LessonDeck";
import styles from "./Lesson.module.css";

// The lesson experience is a full-screen deck (see LessonDeck). This page owns
// the server sync: loading the lesson, persisting the step position, and
// recording completion.
export function LessonPage() {
  const { slug = "", lessonId = "" } = useParams();
  const { data: lesson, isPending, error } = useLesson(slug, lessonId);
  const updateProgress = useUpdateLessonProgress(slug);
  usePageTitle(lesson?.title);

  const [completed, setCompleted] = useState(false);
  // Server state is applied once per lesson load; after that the deck owns
  // position locally and pushes changes up.
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (lesson && initializedFor.current !== lesson.id) {
      initializedFor.current = lesson.id;
      setCompleted(lesson.completed);
    }
  }, [lesson]);

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

  return (
    <LessonDeck
      key={lesson.id}
      lesson={lesson}
      slug={slug}
      moduleTitle={lesson.moduleTitle}
      completed={completed}
      initialStep={lesson.lastSlide}
      onStepChange={(step) =>
        updateProgress.mutate({ lessonId: lesson.id, lastSlide: step })
      }
      onComplete={() => {
        setCompleted(true);
        updateProgress.mutate({ lessonId: lesson.id, completed: true });
      }}
    />
  );
}
