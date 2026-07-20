import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Portrait, Badge } from "../components/ui";
import { FilterSelect, type FilterGroup } from "../components/FilterSelect";
import { useProjectsList, useNeedsTaxonomy, useCategories } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Projects.module.css";

export function ProjectsPage() {
  usePageTitle("Projects");
  const { data: projects = [], isPending, error } = useProjectsList();
  const { data: needsTaxonomy = [] } = useNeedsTaxonomy();
  const { data: industries = [] } = useCategories("industry");

  // Filter state
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Seed the category filter from the URL once (e.g. arriving from a project's
  // category badge: /projects?category=<slug>). The filter matches on category
  // id, so we resolve the slug(s) after the industries taxonomy has loaded. The
  // ref guard ensures we only apply the URL on entry, never clobbering the
  // user's subsequent filter changes.
  const seededFromUrl = useRef(false);
  useEffect(() => {
    if (seededFromUrl.current || industries.length === 0) return;
    seededFromUrl.current = true;

    const slugs = searchParams.getAll("category");
    if (slugs.length === 0) return;

    const ids = industries.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
    if (ids.length > 0) setSelectedCategories(new Set(ids));
  }, [industries, searchParams]);

  const needGroups: FilterGroup[] = useMemo(
    () => needsTaxonomy.map((cat) => ({ name: cat.name, options: cat.options })),
    [needsTaxonomy]
  );
  const categoryGroups: FilterGroup[] = useMemo(
    () => (industries.length ? [{ options: industries }] : []),
    [industries]
  );

  // id -> display name for active-filter chips
  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of needsTaxonomy) for (const o of cat.options) map.set(o.id, o.name);
    for (const c of industries) map.set(c.id, c.name);
    return map;
  }, [needsTaxonomy, industries]);

  const toggleNeed = useCallback((id: string) => {
    setSelectedNeeds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedNeeds(new Set());
    setSelectedCategories(new Set());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      // Keyword search spans title, description, and the project's tag labels
      const haystack = [
        p.title,
        p.description,
        ...(p.needs ?? []).map((n) => n.name),
        ...(p.categories ?? []).map((c) => c.name),
      ];
      const matchesQuery = !q || haystack.some((f) => f?.toLowerCase().includes(q));
      const matchesNeeds =
        selectedNeeds.size === 0 || (p.needs ?? []).some((n) => selectedNeeds.has(n.id));
      const matchesCategories =
        selectedCategories.size === 0 ||
        (p.categories ?? []).some((c) => selectedCategories.has(c.id));
      return matchesQuery && matchesNeeds && matchesCategories;
    });
  }, [projects, query, selectedNeeds, selectedCategories]);

  const activeIds = [...selectedNeeds, ...selectedCategories];
  const hasActiveFilters = query.trim() !== "" || activeIds.length > 0;

  if (isPending) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Projects</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Projects</h1>
        </header>
        <p className={styles.message}>{error.message || "Failed to load projects"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <p className={styles.subtitle}>
          {hasActiveFilters
            ? `${filtered.length} of ${projects.length} project${projects.length !== 1 ? "s" : ""}`
            : `${projects.length} project${projects.length !== 1 ? "s" : ""} from the community`}
        </p>
      </header>

      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search projects by title, description, or keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
          {needGroups.length > 0 && (
            <FilterSelect
              label="Needs"
              groups={needGroups}
              selected={selectedNeeds}
              onToggle={toggleNeed}
            />
          )}
          {categoryGroups.length > 0 && (
            <FilterSelect
              label="Category"
              groups={categoryGroups}
              selected={selectedCategories}
              onToggle={toggleCategory}
            />
          )}
        </div>

        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {activeIds.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.activeChip}
                onClick={() =>
                  selectedNeeds.has(id) ? toggleNeed(id) : toggleCategory(id)
                }
              >
                {labelById.get(id) ?? "Filter"} <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <p className={styles.message}>No projects yet.</p>
      ) : filtered.length === 0 ? (
        <p className={styles.message}>
          No projects match your filters.{" "}
          <button type="button" className={styles.inlineClear} onClick={clearFilters}>
            Clear filters
          </button>
        </p>
      ) : (
        <div className={styles.list}>
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.projectTitle}>{project.title}</h2>
                <Badge variant="muted">{project.status}</Badge>
              </div>

              {project.description && (
                <p className={styles.description}>{project.description}</p>
              )}

              {((project.categories?.length ?? 0) > 0 ||
                (project.needs?.length ?? 0) > 0) && (
                <div className={styles.tags}>
                  {project.categories?.map((c) => (
                    <span
                      key={c.id}
                      className={`${styles.tag} ${styles.tagCategory} ${selectedCategories.has(c.id) ? styles.tagMatch : ""}`}
                    >
                      {c.name}
                    </span>
                  ))}
                  {project.needs?.map((n) => (
                    <span
                      key={n.id}
                      className={`${styles.tag} ${selectedNeeds.has(n.id) ? styles.tagMatch : ""}`}
                    >
                      {n.name}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.creator}>
                <Portrait
                  src={project.creator.portraitUrl}
                  alt={project.creator.name}
                  size="sm"
                />
                <span className={styles.creatorName}>{project.creator.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
