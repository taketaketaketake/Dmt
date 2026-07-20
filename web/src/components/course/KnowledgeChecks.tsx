import { useState } from "react";
import type { KnowledgeCheckItem } from "../../data/types";
import styles from "./KnowledgeChecks.module.css";

interface Props {
  checks: KnowledgeCheckItem[];
  /** Called whenever the number of answered questions changes. */
  onAnsweredChange: (answered: number) => void;
}

/**
 * Ungraded end-of-lesson knowledge checks (ADR-010): pick an answer, get
 * instant feedback and the explanation. Answering (right or wrong) is what
 * soft-gates lesson completion — these are learning aids, not assessments.
 */
export function KnowledgeChecks({ checks, onAnsweredChange }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (checks.length === 0) return null;

  const answer = (checkId: string, optionIndex: number) => {
    if (answers[checkId] !== undefined) return; // one attempt per question
    const next = { ...answers, [checkId]: optionIndex };
    setAnswers(next);
    onAnsweredChange(Object.keys(next).length);
  };

  return (
    <section className={styles.checks}>
      <h2 className={styles.heading}>Check your understanding</h2>
      {checks.map((check, i) => {
        const picked = answers[check.id];
        const answered = picked !== undefined;
        return (
          <div key={check.id} className={styles.check}>
            <p className={styles.question}>
              {i + 1}. {check.question}
            </p>
            <div className={styles.options} role="radiogroup" aria-label={check.question}>
              {check.options.map((option, oi) => {
                let cls = styles.option;
                if (answered) {
                  if (oi === check.correctIndex) cls = styles.optionCorrect;
                  else if (oi === picked) cls = styles.optionWrong;
                  else cls = styles.optionDisabled;
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    className={cls}
                    onClick={() => answer(check.id, oi)}
                    disabled={answered}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className={picked === check.correctIndex ? styles.feedbackRight : styles.feedbackWrong}>
                {picked === check.correctIndex
                  ? "Correct."
                  : `Not quite — the answer is "${check.options[check.correctIndex]}".`}
                {check.explanation ? ` ${check.explanation}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
