import { useState, useEffect, useCallback } from "react";
import { projects as projectsApi, needs as needsApi } from "../../lib/api";
import type { NeedCategory, ProjectNeed, NeedInput } from "../../data/types";
import styles from "./NeedsEditor.module.css";

interface NeedsEditorProps {
  projectId: string;
  onSaved?: () => void;
}

const MAX_CATEGORIES = 3;
const MAX_OPTIONS_PER_CATEGORY = 2;
const MAX_CONTEXT_LENGTH = 180;
const URL_PATTERN = /https?:\/\/|www\.|\.com|\.org|\.net|\.io|\.co\b/i;

export function NeedsEditor({ projectId, onSaved }: NeedsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [taxonomy, setTaxonomy] = useState<NeedCategory[]>([]);
  const [currentNeeds, setCurrentNeeds] = useState<ProjectNeed[]>([]);
  const [editNeeds, setEditNeeds] = useState<NeedInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load taxonomy (cached globally)
  useEffect(() => {
    needsApi.taxonomy().then((data) => setTaxonomy(data.categories));
  }, []);

  // Load current needs when expanded
  const loadNeeds = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getNeeds(projectId);
      setCurrentNeeds(data.needs);
      // Convert to edit format
      setEditNeeds(
        data.needs.map((n) => ({
          categoryId: n.categoryId,
          optionIds: n.optionIds,
          contextText: n.contextText || "",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load needs");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isExpanded && taxonomy.length > 0) {
      loadNeeds();
    }
  }, [isExpanded, taxonomy.length, loadNeeds]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setError(null);
  }, []);

  // Add a new category
  const addCategory = useCallback(
    (categoryId: string) => {
      if (editNeeds.length >= MAX_CATEGORIES) return;
      if (editNeeds.some((n) => n.categoryId === categoryId)) return;
      setEditNeeds((prev) => [...prev, { categoryId, optionIds: [], contextText: "" }]);
      setHasChanges(true);
    },
    [editNeeds]
  );

  // Remove a category
  const removeCategory = useCallback((categoryId: string) => {
    setEditNeeds((prev) => prev.filter((n) => n.categoryId !== categoryId));
    setHasChanges(true);
  }, []);

  // Toggle an option
  const toggleOption = useCallback(
    (categoryId: string, optionId: string) => {
      setEditNeeds((prev) =>
        prev.map((n) => {
          if (n.categoryId !== categoryId) return n;
          const hasOption = n.optionIds.includes(optionId);
          if (hasOption) {
            return { ...n, optionIds: n.optionIds.filter((id) => id !== optionId) };
          }
          if (n.optionIds.length >= MAX_OPTIONS_PER_CATEGORY) return n;
          return { ...n, optionIds: [...n.optionIds, optionId] };
        })
      );
      setHasChanges(true);
    },
    []
  );

  // Update context text
  const updateContext = useCallback((categoryId: string, text: string) => {
    // Enforce max length
    const trimmed = text.slice(0, MAX_CONTEXT_LENGTH);
    setEditNeeds((prev) =>
      prev.map((n) => (n.categoryId === categoryId ? { ...n, contextText: trimmed } : n))
    );
    setHasChanges(true);
  }, []);

  // Validate and save
  const handleSave = useCallback(async () => {
    setError(null);

    // Validate each need has at least one option
    for (const need of editNeeds) {
      if (need.optionIds.length === 0) {
        const cat = taxonomy.find((c) => c.id === need.categoryId);
        setError(`Please select at least one option for "${cat?.name || "category"}"`);
        return;
      }
      // Check for URLs in context
      if (need.contextText && URL_PATTERN.test(need.contextText)) {
        setError("URLs are not allowed in context text");
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = await projectsApi.updateNeeds(projectId, editNeeds);
      setCurrentNeeds(data.needs);
      setHasChanges(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save needs");
    } finally {
      setIsSaving(false);
    }
  }, [projectId, editNeeds, taxonomy, onSaved]);

  // Cancel changes
  const handleCancel = useCallback(() => {
    setEditNeeds(
      currentNeeds.map((n) => ({
        categoryId: n.categoryId,
        optionIds: n.optionIds,
        contextText: n.contextText || "",
      }))
    );
    setHasChanges(false);
    setError(null);
  }, [currentNeeds]);

  // Get available categories (not yet selected)
  const availableCategories = taxonomy.filter(
    (cat) => !editNeeds.some((n) => n.categoryId === cat.id)
  );

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleExpand}
        aria-expanded={isExpanded}
      >
        <span className={styles.toggleLabel}>
          Project Needs
          {currentNeeds.length > 0 && (
            <span className={styles.needsCount}>({currentNeeds.length})</span>
          )}
        </span>
        <span className={styles.toggleIcon}>{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {isLoading ? (
            <p className={styles.loading}>Loading...</p>
          ) : (
            <>
              {error && <p className={styles.error}>{error}</p>}

              <p className={styles.hint}>
                Select up to {MAX_CATEGORIES} categories to tell the community how they can help.
              </p>

              {/* Selected categories */}
              {editNeeds.map((need) => {
                const category = taxonomy.find((c) => c.id === need.categoryId);
                if (!category) return null;
                return (
                  <div key={need.categoryId} className={styles.categoryCard}>
                    <div className={styles.categoryHeader}>
                      <span className={styles.categoryName}>{category.name}</span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeCategory(need.categoryId)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className={styles.options}>
                      {category.options.map((option) => {
                        const isSelected = need.optionIds.includes(option.id);
                        const isDisabled =
                          !isSelected && need.optionIds.length >= MAX_OPTIONS_PER_CATEGORY;
                        return (
                          <label
                            key={option.id}
                            className={`${styles.option} ${isDisabled ? styles.optionDisabled : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => toggleOption(need.categoryId, option.id)}
                            />
                            <span>{option.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className={styles.contextField}>
                      <label className={styles.contextLabel}>
                        Context (optional, {MAX_CONTEXT_LENGTH - (need.contextText?.length || 0)}{" "}
                        chars left)
                      </label>
                      <input
                        type="text"
                        value={need.contextText || ""}
                        onChange={(e) => updateContext(need.categoryId, e.target.value)}
                        placeholder="Brief context about this need..."
                        className={styles.contextInput}
                        maxLength={MAX_CONTEXT_LENGTH}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Add category dropdown */}
              {editNeeds.length < MAX_CATEGORIES && availableCategories.length > 0 && (
                <div className={styles.addCategory}>
                  <select
                    className={styles.addSelect}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addCategory(e.target.value);
                    }}
                  >
                    <option value="">+ Add a need category</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Save/Cancel buttons */}
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
                    {isSaving ? "Saving..." : "Save Needs"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
