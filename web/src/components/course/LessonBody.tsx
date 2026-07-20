import { Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KnowledgeCheckItem } from "../../data/types";
import { BreakevenCalculator } from "./BreakevenCalculator";
import { KnowledgeChecks } from "./KnowledgeChecks";
import styles from "./LessonBody.module.css";

interface Props {
  body: string;
  checks: KnowledgeCheckItem[];
  onChecksAnsweredChange: (answered: number) => void;
}

// Widget markers are lines like ":::calculator breakeven" or ":::checks".
// Everything between markers is plain markdown.
const WIDGET_LINE = /^:::([a-z]+)(?:[ \t]+(\S+))?[ \t]*$/;

type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "widget"; name: string; arg?: string };

function parseSegments(body: string): Segment[] {
  const segments: Segment[] = [];
  let buffer: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(WIDGET_LINE);
    if (m) {
      if (buffer.length) segments.push({ kind: "markdown", text: buffer.join("\n") });
      buffer = [];
      segments.push({ kind: "widget", name: m[1], arg: m[2] });
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) segments.push({ kind: "markdown", text: buffer.join("\n") });
  return segments;
}

function Widget({
  name,
  arg,
  checks,
  onChecksAnsweredChange,
}: { name: string; arg?: string } & Pick<Props, "checks" | "onChecksAnsweredChange">) {
  if (name === "calculator" && arg === "breakeven") return <BreakevenCalculator />;
  if (name === "checks")
    return <KnowledgeChecks checks={checks} onAnsweredChange={onChecksAnsweredChange} />;
  return null; // Unknown widget: render nothing rather than breaking the lesson
}

export function LessonBody({ body, checks, onChecksAnsweredChange }: Props) {
  const segments = parseSegments(body);
  const checksPlacedInline = segments.some(
    (s) => s.kind === "widget" && s.name === "checks"
  );

  return (
    <div className={styles.body}>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.kind === "markdown" ? (
            <div className={styles.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
            </div>
          ) : (
            <Widget
              name={seg.name}
              arg={seg.arg}
              checks={checks}
              onChecksAnsweredChange={onChecksAnsweredChange}
            />
          )}
        </Fragment>
      ))}
      {/* Checks default to the end of the lesson unless placed via :::checks */}
      {!checksPlacedInline && (
        <KnowledgeChecks checks={checks} onAnsweredChange={onChecksAnsweredChange} />
      )}
    </div>
  );
}
