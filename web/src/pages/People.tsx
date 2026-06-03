import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../components/ui";
import { FilterSelect, type FilterGroup } from "../components/FilterSelect";
import { profiles as profilesApi, needs as needsApi } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ProfileListItem, NeedCategory } from "../data/types";
import styles from "./People.module.css";

// The "People & Partners" taxonomy category describes roles a person is open to
// (co-founder, advisor, etc.); everything else offerable is a capability/skill.
const PEOPLE_PARTNERS_SLUG = "people-partners";

export function PeoplePage() {
  usePageTitle("People");
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [taxonomy, setTaxonomy] = useState<NeedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Split the taxonomy into the two filter dropdowns. The Skills dropdown is
  // currently removed from the page (see render below) but the grouping is kept
  // so it can be restored without rebuilding it.
  const { partnerGroups } = useMemo(() => {
    const skills: FilterGroup[] = [];
    const partners: FilterGroup[] = [];
    for (const cat of taxonomy) {
      const group: FilterGroup = { name: cat.name, options: cat.options };
      if (cat.slug === PEOPLE_PARTNERS_SLUG) {
        // Roles render as a flat list (no redundant heading)
        partners.push({ options: cat.options });
      } else {
        skills.push(group);
      }
    }
    return { skillGroups: skills, partnerGroups: partners };
  }, [taxonomy]);

  // Option id -> display name (for active-filter chips)
  const optionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of taxonomy) {
      for (const opt of cat.options) map.set(opt.id, opt.name);
    }
    return map;
  }, [taxonomy]);

  const toggleOption = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelected(new Set());
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
        selected.size === 0 || (p.skills ?? []).some((s) => selected.has(s.id));
      return matchesQuery && matchesSkills;
    });
  }, [profiles, query, selected]);

  const hasActiveFilters = query.trim() !== "" || selected.size > 0;

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
        <div className={styles.filterRow}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by name, handle, bio, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search people"
          />
          {/*
            Skills filter removed from the People page per request. Kept in code
            so it can be restored: re-add `skillGroups` to the useMemo destructure
            above and uncomment this block.

            {skillGroups.length > 0 && (
              <FilterSelect
                label="Skills"
                groups={skillGroups}
                selected={selected}
                onToggle={toggleOption}
              />
            )}
          */}
          {partnerGroups.length > 0 && (
            <FilterSelect
              label="People & Partners"
              groups={partnerGroups}
              selected={selected}
              onToggle={toggleOption}
            />
          )}
        </div>

        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {[...selected].map((id) => (
              <button
                key={id}
                type="button"
                className={styles.activeChip}
                onClick={() => toggleOption(id)}
              >
                {optionNames.get(id) ?? "Filter"} <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear all
            </button>
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
                        className={`${styles.cardSkill} ${selected.has(s.id) ? styles.cardSkillMatch : ""}`}
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
