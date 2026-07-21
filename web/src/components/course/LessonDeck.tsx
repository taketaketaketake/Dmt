import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KnowledgeCheckItem, LessonContent } from "../../data/types";
import { BreakevenCalculator } from "./BreakevenCalculator";
import { KnowledgeChecks } from "./KnowledgeChecks";
import { Cards, Compare, Formula, Reveal } from "./DeckBlocks";
import styles from "./LessonDeck.module.css";

/* ─────────────────────────────────────────────────────────────────────────────
   LESSON DECK — full-screen stepped presentation (pitch-deck style)
   Each markdown "## section" is one designed screen; widgets get their own
   screens; a finish screen carries the knowledge checks and completion.
   Arrow keys / dots / chevrons navigate; F toggles fullscreen.
   ──────────────────────────────────────────────────────────────────────────── */

// A section screen is a sequence of blocks; blocks reveal one at a time as
// the member presses → ("builds"), so dense content paces itself.
export type DeckBlock =
  | { type: "md"; md: string }
  | { type: "cards"; items: string[] }
  | { type: "compare"; columns: { title: string; md: string }[] }
  | { type: "formula"; text: string }
  | { type: "reveal"; question: string; md: string };

export type DeckStep =
  | { kind: "title" }
  | { kind: "section"; heading: string | null; blocks: DeckBlock[] }
  | { kind: "widget"; name: string; arg?: string }
  | { kind: "image"; url: string; index: number; total: number }
  | { kind: "finish" };

// Step-level widgets (a whole screen of their own)
const WIDGET_LINE = /^:::(calculator|checks)(?:[ \t]+(\S+))?[ \t]*$/;
// Fenced display blocks (rendered inside a section, closed by ":::")
const FENCE_OPEN = /^:::(cards|compare|formula|reveal)(?:[ \t]+(.+))?$/;
const FENCE_CLOSE = /^:::[ \t]*$/;

function parseFence(name: string, arg: string | undefined, lines: string[]): DeckBlock {
  const content = lines.join("\n").trim();
  switch (name) {
    case "cards": {
      // Each top-level bullet is a card; nested lines stay with their card
      const items: string[] = [];
      for (const line of lines) {
        if (/^- /.test(line)) items.push(line.slice(2));
        else if (items.length && line.trim()) items[items.length - 1] += "\n" + line;
      }
      return { type: "cards", items };
    }
    case "compare": {
      const columns: { title: string; md: string }[] = [];
      for (const line of lines) {
        const h = line.match(/^###[ \t]+(.+)$/);
        if (h) columns.push({ title: h[1].trim(), md: "" });
        else if (columns.length) columns[columns.length - 1].md += line + "\n";
      }
      return { type: "compare", columns };
    }
    case "reveal":
      return { type: "reveal", question: arg ?? "Reveal", md: content };
    default:
      return { type: "formula", text: content };
  }
}

/** Split section markdown into reveal units: each top-level bullet (with its
 *  nested children) is one unit; contiguous non-list lines are one unit. */
function toBlocks(lines: string[]): DeckBlock[] {
  const blocks: DeckBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(FENCE_OPEN);
    if (fence) {
      const inner: string[] = [];
      i++;
      while (i < lines.length && !FENCE_CLOSE.test(lines[i])) inner.push(lines[i++]);
      i++; // closing :::
      blocks.push(parseFence(fence[1], fence[2]?.trim(), inner));
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^- /.test(line)) {
      // Bullet + any indented continuation/children
      const unit = [line];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) unit.push(lines[i++]);
      blocks.push({ type: "md", md: unit.join("\n") });
      continue;
    }
    // Paragraph / blockquote run
    const unit = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^- /.test(lines[i]) &&
      !FENCE_OPEN.test(lines[i])
    ) {
      unit.push(lines[i++]);
    }
    blocks.push({ type: "md", md: unit.join("\n") });
  }
  return blocks;
}

export function parseNativeSteps(body: string): DeckStep[] {
  const steps: DeckStep[] = [{ kind: "title" }];
  let heading: string | null = null;
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const blocks = toBlocks(buffer);
    if (blocks.length || heading) steps.push({ kind: "section", heading, blocks });
    buffer = [];
    heading = null;
  };

  for (const line of body.split("\n")) {
    if (inFence) {
      buffer.push(line);
      if (FENCE_CLOSE.test(line)) inFence = false;
      continue;
    }
    if (FENCE_OPEN.test(line)) {
      inFence = true;
      buffer.push(line);
      continue;
    }
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
  const [showOutline, setShowOutline] = useState(false);
  const outlineRef = useRef<HTMLElement | null>(null);
  const outlineToggleRef = useRef<HTMLButtonElement | null>(null);

  // Close the outline on Escape or on any click outside the panel/toggle.
  useEffect(() => {
    if (!showOutline) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowOutline(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (outlineRef.current?.contains(t) || outlineToggleRef.current?.contains(t)) return;
      setShowOutline(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [showOutline]);

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

  // Resume at the saved position — but saved indices can be stale (recorded
  // in slides mode or an older step layout). If the position lands on or past
  // the finish step, restart from the overview instead of opening at the end.
  const [step, setStep] = useState(() => {
    const last = steps.length - 1;
    return initialStep > 0 && initialStep < last ? initialStep : 0;
  });
  // How many blocks of the current section are visible ("builds"). Sequential
  // → reveals one block at a time; jumps/back arrivals show everything.
  const [revealed, setRevealed] = useState<number>(Infinity);

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
      setRevealed(Infinity); // jumping straight to a screen shows all of it
      onStepChange(next);
    },
    [steps.length, onStepChange]
  );

  const currentBlockCount =
    steps[Math.min(step, steps.length - 1)]?.kind === "section"
      ? (steps[Math.min(step, steps.length - 1)] as Extract<DeckStep, { kind: "section" }>)
          .blocks.length
      : 1;

  // Forward navigation: reveal the next block if any remain, else next step
  // (which starts built from its first block).
  const advance = useCallback(() => {
    if (revealed < currentBlockCount) {
      setRevealed((r) => r + 1);
      return;
    }
    const next = step + 1;
    if (next >= steps.length) return;
    setStep(next);
    setRevealed(1);
    onStepChange(next);
  }, [revealed, currentBlockCount, step, steps.length, onStepChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "BUTTON", "AUDIO"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        advance();
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
  }, [step, goTo, advance]);

  const current = steps[Math.min(step, steps.length - 1)];

  const stepLabel = (s: DeckStep, i: number): string => {
    switch (s.kind) {
      case "title":
        return "Overview";
      case "section":
        return s.heading ?? `Section ${i}`;
      case "widget":
        if (s.name === "calculator") return "Breakeven calculator";
        if (s.name === "checks") return "Knowledge checks";
        return "Interactive";
      case "image":
        return `Slide ${s.index + 1}`;
      case "finish":
        return "Wrap up";
    }
  };

  const renderStep = (s: DeckStep) => {
    switch (s.kind) {
      case "title":
        return (
          <div className={styles.titleStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            <h1 className={styles.titleHeading}>{lesson.title}</h1>
            <p className={styles.titleHint}>
              Use → or the dots below to move through the lesson.
              {lesson.audioUrl ? " Narration is in the player below." : ""}
            </p>
          </div>
        );
      case "section": {
        const visible = s.blocks.slice(0, Math.max(1, revealed));
        const remaining = s.blocks.length - visible.length;
        return (
          <div className={styles.sectionStep}>
            <p className={styles.kicker}>{moduleTitle}</p>
            {s.heading && <h2 className={styles.sectionHeading}>{s.heading}</h2>}
            {visible.map((b, i) => (
              <div key={i} className={styles.unit}>
                {b.type === "md" ? (
                  <div className={styles.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.md}</ReactMarkdown>
                  </div>
                ) : b.type === "cards" ? (
                  <Cards items={b.items} />
                ) : b.type === "compare" ? (
                  <Compare columns={b.columns} />
                ) : b.type === "formula" ? (
                  <Formula text={b.text} />
                ) : (
                  <Reveal question={b.question} md={b.md} />
                )}
              </div>
            ))}
            {remaining > 0 && (
              <button type="button" className={styles.moreHint} onClick={advance}>
                → {remaining} more
              </button>
            )}
          </div>
        );
      }
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
              {lesson.moduleQuiz && (
                <Link
                  to={`/courses/${slug}/modules/${lesson.moduleQuiz.moduleId}/quiz`}
                  className={
                    lesson.moduleQuiz.status === "pending"
                      ? styles.quizCta
                      : styles.quizCtaDone
                  }
                >
                  {lesson.moduleQuiz.status === "pending"
                    ? `Take the module quiz (${lesson.moduleQuiz.questionCount} questions) →`
                    : lesson.moduleQuiz.status === "passed"
                      ? "Module quiz passed ✓ — review answers"
                      : "Module quiz — review answers →"}
                </Link>
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
          ← Course
        </Link>
        <button
          type="button"
          ref={outlineToggleRef}
          className={styles.outlineToggle}
          onClick={() => setShowOutline((v) => !v)}
          aria-expanded={showOutline}
        >
          ☰ Steps
        </button>
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

      {/* Step outline (minimal v1: current lesson's steps, click to jump) */}
      {showOutline && (
        <nav className={styles.outlinePanel} aria-label="Lesson steps" ref={outlineRef}>
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              className={i === step ? styles.outlineItemActive : styles.outlineItem}
              onClick={() => goTo(i)}
            >
              <span className={styles.outlineNum}>{i + 1}</span>
              <span className={styles.outlineLabel}>{stepLabel(s, i)}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Step */}
      <div className={styles.stage}>{renderStep(current)}</div>

      {/* Persistent narration player — lives in the chrome (not inside a
          step) so playback continues while paging through the lesson. */}
      {lesson.audioUrl && (
        <div className={styles.audioBar}>
          <span className={styles.audioBarLabel}>♪ Narration</span>
          <audio
            className={styles.audioBarPlayer}
            controls
            preload="none"
            src={lesson.audioUrl}
          />
        </div>
      )}

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
            onClick={advance}
            disabled={step >= steps.length - 1 && revealed >= currentBlockCount}
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
