import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./DeckBlocks.module.css";

/* ─────────────────────────────────────────────────────────────────────────────
   DECK DISPLAY BLOCKS
   Visual components lesson markdown can declare with fenced markers:

     :::cards            :::compare           :::formula        :::reveal Q?
     - item one          ### Column A         Revenue − Costs   answer text
     - item two          - point              = Net Profit      :::
     :::                 ### Column B         :::
                         - point
                         :::

   These render inside a section screen (unlike :::calculator / :::checks,
   which are whole steps of their own).
   ──────────────────────────────────────────────────────────────────────────── */

const ACCENTS = ["#a3b8a3", "#a3aebf", "#bfa3a3", "#b8a3bf", "#bfb8a3", "#a3bfbc"];

function Md({ children }: { children: string }) {
  return (
    <div className={styles.md}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function Cards({ items }: { items: string[] }) {
  return (
    <div className={styles.cards}>
      {items.map((item, i) => (
        <div key={i} className={styles.card}>
          <p className={styles.cardNum} style={{ color: ACCENTS[i % ACCENTS.length] }}>
            {String(i + 1).padStart(2, "0")}
          </p>
          <Md>{item}</Md>
        </div>
      ))}
    </div>
  );
}

export function Compare({ columns }: { columns: { title: string; md: string }[] }) {
  return (
    <div className={styles.compare}>
      {columns.map((col, i) => (
        <div key={i} className={styles.compareCol}>
          <p className={styles.compareTitle} style={{ color: ACCENTS[i % ACCENTS.length] }}>
            {col.title}
          </p>
          <Md>{col.md}</Md>
        </div>
      ))}
    </div>
  );
}

export function Formula({ text }: { text: string }) {
  return (
    <div className={styles.formula}>
      {text
        .split("\n")
        .filter((l) => l.trim())
        .map((line, i) => (
          <p key={i} className={styles.formulaLine}>
            {line.trim()}
          </p>
        ))}
    </div>
  );
}

export function Reveal({ question, md }: { question: string; md: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.reveal}>
      <button
        type="button"
        className={styles.revealButton}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.revealMark}>{open ? "−" : "+"}</span>
        {question}
      </button>
      {open && (
        <div className={styles.revealBody}>
          <Md>{md}</Md>
        </div>
      )}
    </div>
  );
}
