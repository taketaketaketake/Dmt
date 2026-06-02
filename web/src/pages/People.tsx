import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../components/ui";
import { profiles as profilesApi, needs as needsApi } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ProfileListItem, NeedCategory } from "../data/types";
import styles from "./People.module.css";

export function PeoplePage() {
  usePageTitle("People");
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [taxonomy, setTaxonomy] = useState<NeedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [query, setQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([profilesApi.list(), needsApi.taxonomy({ offerable: true })])
      .then(([profileData, taxData]) => {
        setProfiles(profileData.profiles);
        setTaxonomy(taxData.categories);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profiles");
        setIsLoading(false);
      });
  }, []);

  // Map skill option id -> display name (for active-filter chips)
  const skillNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of taxonomy) {
      for (const opt of cat.options) map.set(opt.id, opt.name);
    }
    return map;
  }, [taxonomy]);

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedSkills(new Set());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesQuery =
        !q ||
        [p.name, p.handle, p.bio, p.location].some((f) =>
          f?.toLowerCase().includes(q)
        );
      const matchesSkills =
        selectedSkills.size === 0 ||
        (p.skills ?? []).some((s) => selectedSkills.has(s.id));
      return matchesQuery && matchesSkills;
    });
  }, [profiles, query, selectedSkills]);

  const hasActiveFilters = query.trim() !== "" || selectedSkills.size > 0;

  if (isLoading) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>People</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>People</h1>
        </header>
        <p className={styles.message}>{error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>People</h1>
        <p className={styles.subtitle}>
          {hasActiveFilters
            ? `${filtered.length} of ${profiles.length} builder${profiles.length !== 1 ? "s" : ""}`
            : `${profiles.length} builder${profiles.length !== 1 ? "s" : ""} in the directory`}
        </p>
      </header>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchRow}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by name, handle, bio, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search people"
          />
          <button
            type="button"
            className={`${styles.filterToggle} ${selectedSkills.size > 0 ? styles.filterToggleActive : ""}`}
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            Skills{selectedSkills.size > 0 ? ` (${selectedSkills.size})` : ""}
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {[...selectedSkills].map((id) => (
              <button
                key={id}
                type="button"
                className={styles.activeChip}
                onClick={() => toggleSkill(id)}
              >
                {skillNames.get(id) ?? "Skill"} <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              className={styles.clearButton}
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Expandable skill picker, grouped by category */}
        {showFilters && (
          <div className={styles.skillPanel}>
            {taxonomy.map((cat) => (
              <div key={cat.id} className={styles.skillGroup}>
                <h2 className={styles.skillGroupName}>{cat.name}</h2>
                <div className={styles.skillChips}>
                  {cat.options.map((opt) => {
                    const isSelected = selectedSkills.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`${styles.skillChip} ${isSelected ? styles.skillChipActive : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => toggleSkill(opt.id)}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {profiles.length === 0 ? (
        <p className={styles.message}>No profiles yet.</p>
      ) : filtered.length === 0 ? (
        <p className={styles.message}>
          No people match your filters.{" "}
          <button type="button" className={styles.inlineClear} onClick={clearFilters}>
            Clear filters
          </button>
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((profile) => (
            <Link
              key={profile.id}
              to={`/people/${profile.handle}`}
              className={styles.card}
            >
              <Portrait src={profile.portraitUrl} alt={profile.name} size="lg" />
              <div className={styles.cardContent}>
                <h2 className={styles.name}>{profile.name}</h2>
                <p className={styles.handle}>@{profile.handle}</p>
                {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                {profile.skills && profile.skills.length > 0 && (
                  <div className={styles.cardSkills}>
                    {profile.skills.map((s) => (
                      <span
                        key={s.id}
                        className={`${styles.cardSkill} ${selectedSkills.has(s.id) ? styles.cardSkillMatch : ""}`}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
