import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KnowledgeCheckItem, LessonContent } from "../../data/types";
import { BreakevenCalculator } from "./BreakevenCalculator";
import { KnowledgeChecks } from "./KnowledgeChecks";
import styles from "./LessonDeck.module.css";

/* ─────────────────────────────────────────────────────────────────────────────
   LESSON DECK — full-screen stepped presentation (pitch-deck style)
   Each markdown "## section" is one designed screen; widgets get their own
   screens; a finish screen carries the knowledge checks and completion.
   Arrow keys / dots / chevrons navigate; F toggles fullscreen.
   ──────────────────────────────────────────────────────────────────────────── */

export type DeckStep =
  | { kind: "title" }
  | { kind: "section"; heading: string | null; md: string }
  | { kind: "widget"; name: string; arg?: string }
  | { kind: "image"; url: string; index: number; total: number }
  | { kind: "finish" };

const WIDGET_LINE = /^:::([a-z]+)(?:[ \t]+(\S+))?[ \t]*$/;

function parseNativeSteps(body: string): DeckStep[] {
  const steps: DeckStep[] = [{ kind: "title" }];
  let heading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const md = buffer.join("\n").trim();
    if (md || heading) steps.push({ kind: "section", heading, md });
    buffer = [];
    heading = null;
  };

  for (const line of body.split("\n")) {
    const widget = line.match(WIDGET_LINE);
    if (widget) {
      flush();
      steps.push({ kind: "widget", name: widget[1], arg: widget[2] });
      continue;
    }
    const h2 = line.match(/^##[ \t]+(.+)$/);
    if (h2) {
      flush();
      heading = h2[1].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();
  steps.push({ kind: "finish" });
  return steps;
}

interface Props {
  lesson: LessonContent;
  slug: string;
  moduleTitle: string;
  completed: boolean;
  /** Persist the current step index (maps to LessonProgress.lastSlide). */
  onStepChange: (step: number) => void;
  onComplete: () => void;
  initialStep: number;
}

function Widget({
  name,
  arg,
  checks,
  onAnswered,
}: {
  name: string;
  arg?: string;
  checks: KnowledgeCheckItem[];
  onAnswered: (n: number) => void;
}) {
  if (name === "calculator" && arg === "breakeven") return <BreakevenCalculator />;
  if (name === "checks") return <KnowledgeChecks checks={checks} onAnsweredChange={onAnswered} />;
  return null;
}

export function LessonDeck({
  lesson,
  slug,
  moduleTitle,
  completed,
  onStepChange,
  onComplete,
  initialStep,
}: Props) {
  const [mode, setMode] = useState<"native" | "slides">(lesson.body ? "native" : "slides");
  const [checksAnswered, setChecksAnswered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const steps = useMemo<DeckStep[]>(() => {
    if (mode === "native" && lesson.body) return parseNativeSteps(lesson.body);
    const imgs = lesson.slideUrls.map((url, i) => ({
      kind: "image" as const,
      url,
      index: i,
      total: lesson.slideUrls.length,
    }));
    return [...imgs, { kind: "finish" as const }];
  }, [mode, lesson.body, lesson.slideUrls]);

  const [step, setStep] = useState(() => Math.min(initialStep, steps.length - 1));

  const checksPlacedInline = useMemo(
    () => (lesson.body ?? "").split("\n").some((l) => l.match(WIDGET_LINE)?.[1] === "checks"),
    [lesson.body]
  );
  const checksRemaining =
    lesson.checks.length > 0 && checksAnswered < lesson.checks.length;

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= steps.length) return;
      setStep(next);
      onStepChange(next);
    },
    [steps.length, onStepChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "BUTTON", "AUDIO"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goTo(step + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(step - 1);
      }
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    };
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [step, goTo]);

  const current = steps[Math.min(step, steps.length - 1)];

  const renderStep = (s: DeckStep) => {
    switch (s.kind) {
      case "title":
        return (
          <div className={styles.titleStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            <h1 className={styles.titleHeading}>{lesson.title}</h1>
            {lesson.audioUrl && (
              <div className={styles.titleAudio}>
                <p className={styles.audioLabel}>Listen to this lesson</p>
                <audio controls preload="none" src={lesson.audioUrl} />
              </div>
            )}
            <p className={styles.titleHint}>
              Use → or the dots below to move through the lesson.
            </p>
          </div>
        );
      case "section":
        return (
          <div className={styles.sectionStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            {s.heading && <h2 className={styles.sectionHeading}>{s.heading}</h2>}
            <div className={styles.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.md}</ReactMarkdown>
            </div>
          </div>
        );
      case "widget":
        return (
          <div className={styles.sectionStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            <Widget
              name={s.name}
              arg={s.arg}
              checks={lesson.checks}
              onAnswered={setChecksAnswered}
            />
          </div>
        );
      case "image":
        return (
          <div
            className={styles.imageStep}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX - rect.left > rect.width / 2) goTo(step + 1);
              else goTo(step - 1);
            }}
          >
            <img src={s.url} alt={`${lesson.title} — slide ${s.index + 1} of ${s.total}`} />
            {s.index + 1 < s.total && (
              <link rel="preload" as="image" href={lesson.slideUrls[s.index + 1]} />
            )}
          </div>
        );
      case "finish":
        return (
          <div className={styles.finishStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            <h2 className={styles.sectionHeading}>
              {completed ? "Lesson complete" : "Wrap up"}
            </h2>
            {!checksPlacedInline && lesson.checks.length > 0 && (
              <KnowledgeChecks checks={lesson.checks} onAnsweredChange={setChecksAnswered} />
            )}
            <div className={styles.finishActions}>
              {completed ? (
                <span className={styles.completedBadge}>✓ Completed</span>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.completeButton}
                    onClick={onComplete}
                    disabled={checksRemaining}
                  >
                    Mark complete
                  </button>
                  {checksRemaining && (
                    <p className={styles.completeHint}>Answer the knowledge checks first</p>
                  )}
                </>
              )}
              <div className={styles.finishNav}>
                {lesson.prev && (
                  <Link to={`/courses/${slug}/lessons/${lesson.prev.id}`}>
                    ← {lesson.prev.title}
                  </Link>
                )}
                {lesson.next && (
                  <Link to={`/courses/${slug}/lessons/${lesson.next.id}`}>
                    {lesson.next.title} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.deck}>
      {/* Top chrome */}
      <div className={styles.topBar}>
        <Link to={`/courses/${slug}`} className={styles.exitLink}>
          ← Outline
        </Link>
        <span className={styles.topTitle}>{lesson.title}</span>
        {lesson.body && lesson.slideUrls.length > 0 && (
          <button
            type="button"
            className={styles.modeToggle}
            onClick={() => {
              setMode(mode === "native" ? "slides" : "native");
              setStep(0);
            }}
          >
            {mode === "native" ? "Original slides" : "Lesson view"}
          </button>
        )}
      </div>

      {/* Step */}
      <div className={styles.stage}>{renderStep(current)}</div>

      {/* Bottom chrome */}
      <div className={styles.bottomBar}>
        <span className={styles.counter}>
          {Math.min(step, steps.length - 1) + 1} / {steps.length}
        </span>

        <div className={styles.dots}>
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              className={i === step ? styles.dotActive : styles.dot}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
          >
            ←
          </button>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => goTo(step + 1)}
            disabled={step >= steps.length - 1}
          >
            →
          </button>
          <button
            type="button"
            className={styles.chevron}
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else document.documentElement.requestFullscreen();
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
      </div>
    </div>
  );
}
