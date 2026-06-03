import { useState, useRef, useEffect, useCallback, useId } from "react";
import styles from "./FilterSelect.module.css";

export interface FilterOption {
  id: string;
  name: string;
}

export interface FilterGroup {
  /** Optional heading shown above this group's options. */
  name?: string;
  options: FilterOption[];
}

interface FilterSelectProps {
  label: string;
  groups: FilterGroup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

/**
 * Always-visible multi-select filter: a labelled button that opens a popover
 * checklist. Closes on outside-click or Escape. Mobile-friendly (full-width
 * trigger, scrollable panel). Used by the People and Projects filter bars.
 */
export function FilterSelect({ label, groups, selected, onToggle }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Count of selected options that belong to this dropdown's groups
  const count = groups.reduce(
    (n, g) => n + g.options.filter((o) => selected.has(o.id)).length,
    0
  );

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${count > 0 ? styles.triggerActive : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleOpen}
      >
        <span>
          {label}
          {count > 0 ? ` (${count})` : ""}
        </span>
        <span className={styles.caret} aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className={styles.panel} id={panelId} role="listbox" aria-multiselectable>
          {groups.map((group, gi) => (
            <div key={group.name ?? gi} className={styles.group}>
              {group.name && <p className={styles.groupName}>{group.name}</p>}
              {group.options.map((option) => {
                const isSelected = selected.has(option.id);
                return (
                  <label key={option.id} className={styles.option}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(option.id)}
                    />
                    <span>{option.name}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
