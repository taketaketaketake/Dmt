import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useModuleQuiz, useSubmitQuizAttempt } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ModuleQuiz.module.css";

// Graded module quiz: two attempts, pass at 70%. Failing twice marks the
// module failed and the member moves on — the outcome is recorded, not a gate.
export function ModuleQuizPage() {
  const { slug = "", moduleId = "" } = useParams();
  const { data: quiz, isPending, error } = useModuleQuiz(slug, moduleId);
  const submit = useSubmitQuizAttempt(slug, moduleId);
  usePageTitle(quiz ? `${quiz.moduleTitle} — Quiz` : "Quiz");

  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Quiz not found"}</p>
      </div>
    );
  }

  const lastResult = submit.data;
  const finished = quiz.status !== "pending" || Boolean(lastResult?.finished);
  const showingResult = Boolean(lastResult) || quiz.status !== "pending";
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const attemptsLeft = quiz.maxAttempts - quiz.attemptsUsed;
  const bestScore = quiz.attempts.length
    ? Math.max(...quiz.attempts.map((a) => a.score))
    : null;

  const handleSubmit = () => {
    if (!allAnswered || submit.isPending) return;
    submit.mutate(quiz.questions.map((q) => answers[q.id]));
  };

  const retry = () => {
    setAnswers({});
    submit.reset();
  };

  return (
    <div className="container">
      <header className={styles.header}>
        <Link to={`/courses/${slug}`} className={styles.backLink}>
          ← Course outline
        </Link>
        <p className={styles.kicker}>{quiz.moduleTitle}</p>
        <h1 className={styles.title}>Module Quiz</h1>
        <p className={styles.subtitle}>
          {quiz.status === "passed" || lastResult?.status === "passed" ? (
            <span className={styles.passed}>✓ Passed</span>
          ) : quiz.status === "failed" || lastResult?.status === "failed" ? (
            <span className={styles.failed}>
              Not passed{bestScore !== null ? ` — best score ${bestScore} of ${quiz.questions.length}` : ""}. The
              answers are below; keep going with the course.
            </span>
          ) : (
            <>
              {quiz.questions.length} questions · pass with{" "}
              {Math.ceil(quiz.questions.length * 0.7)} or more correct ·{" "}
              {attemptsLeft} of {quiz.maxAttempts} attempts left
            </>
          )}
        </p>
      </header>

      <div className={styles.questions}>
        {quiz.questions.map((q, qi) => {
          const picked = answers[q.id];
          const result = lastResult?.results?.[qi];
          const revealedIndex =
            q.correctIndex ?? lastResult?.answerKey?.[qi]?.correctIndex;
          const revealedExplanation =
            q.explanation ?? lastResult?.answerKey?.[qi]?.explanation;

          return (
            <div key={q.id} className={styles.question}>
              <p className={styles.questionText}>
                {qi + 1}. {q.question}
              </p>
              <div className={styles.options} role="radiogroup" aria-label={q.question}>
                {q.options.map((option, oi) => {
                  let cls = styles.option;
                  if (revealedIndex !== undefined) {
                    if (oi === revealedIndex) cls = styles.optionCorrect;
                    else if (oi === picked) cls = styles.optionWrong;
                    else cls = styles.optionMuted;
                  } else if (showingResult && result) {
                    // Attempt graded but key withheld: mark only their pick
                    if (oi === picked)
                      cls = result.correct ? styles.optionCorrect : styles.optionWrong;
                  } else if (oi === picked) {
                    cls = styles.optionPicked;
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={cls}
                      disabled={showingResult}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {revealedExplanation && (
                <p className={styles.explanation}>{revealedExplanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        {!showingResult ? (
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!allAnswered || submit.isPending}
          >
            {submit.isPending
              ? "Grading..."
              : `Submit answers (attempt ${quiz.attemptsUsed + 1} of ${quiz.maxAttempts})`}
          </button>
        ) : lastResult && !finished ? (
          <div className={styles.resultRow}>
            <p className={styles.resultText}>
              {lastResult.attempt.score} of {lastResult.attempt.total} correct — you
              need {Math.ceil(lastResult.attempt.total * 0.7)} to pass. One attempt
              left.
            </p>
            <button type="button" className={styles.submitButton} onClick={retry}>
              Try again
            </button>
          </div>
        ) : (
          <Link to={`/courses/${slug}`} className={styles.continueLink}>
            Continue with the course →
          </Link>
        )}
      </footer>
    </div>
  );
}
