import { useState, useEffect, useMemo, useCallback } from "react";
import { profiles as profilesApi, needs as needsApi } from "../../lib/api";
import type { NeedCategory } from "../../data/types";
import styles from "./SkillsEditor.module.css";

const MAX_SKILLS = 10;

interface SkillsEditorProps {
  /** Called after a successful save, with the new skill option ids. */
  onSaved?: (optionIds: string[]) => void;
}

/**
 * Self-contained editor for a person's skill tags. Skills are drawn from the
 * offerable subset of the shared needs taxonomy, so they can be matched against
 * project needs. Loads and saves on its own (PUT /api/profiles/me/skills).
 */
export function SkillsEditor({ onSaved }: SkillsEditorProps) {
  const [taxonomy, setTaxonomy] = useState<NeedCategory[]>([]);
  const [currentIds, setCurrentIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([needsApi.taxonomy({ offerable: true }), profilesApi.skills()])
      .then(([tax, sk]) => {
        setTaxonomy(tax.categories);
        const ids = sk.skills.map((s) => s.id);
        setCurrentIds(ids);
        setSelectedIds(ids);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load skills")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const hasChanges = useMemo(() => {
    if (selectedIds.length !== currentIds.length) return true;
    const saved = new Set(currentIds);
    return selectedIds.some((id) => !saved.has(id));
  }, [selectedIds, currentIds]);

  const atMax = selectedIds.length >= MAX_SKILLS;

  const toggle = useCallback((id: string) => {
    setError(null);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SKILLS) return prev;
      return [...prev, id];
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { skills } = await profilesApi.updateSkills(selectedIds);
      const ids = skills.map((s) => s.id);
      setCurrentIds(ids);
      setSelectedIds(ids);
      onSaved?.(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skills");
    } finally {
      setIsSaving(false);
    }
  }, [selectedIds, onSaved]);

  const handleCancel = useCallback(() => {
    setSelectedIds(currentIds);
    setError(null);
  }, [currentIds]);

  return (
    <section className={styles.container}>
      <div className={styles.head}>
        <h2 className={styles.title}>Skills</h2>
        <span className={styles.count}>
          {selectedIds.length}/{MAX_SKILLS}
        </span>
      </div>
      <p className={styles.hint}>
        Pick what you can offer the community. These power the filters on the
        People directory and match you to projects looking for help.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {isLoading ? (
        <p className={styles.loading}>Loading...</p>
      ) : (
        <>
          {taxonomy.map((category) => (
            <div key={category.id} className={styles.group}>
              <h3 className={styles.groupName}>{category.name}</h3>
              <div className={styles.chips}>
                {category.options.map((option) => {
                  const isSelected = selectedSet.has(option.id);
                  const isDisabled = !isSelected && atMax;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.chip} ${isSelected ? styles.chipActive : ""}`}
                      aria-pressed={isSelected}
                      disabled={isDisabled}
                      onClick={() => toggle(option.id)}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {hasChanges && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save skills"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
