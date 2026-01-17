import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Portrait, Badge } from "../components/ui";
import { projects as projectsApi, follows as followsApi, type ProjectDetail } from "../lib/api";
import styles from "./ProjectDetail.module.css";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    projectsApi
      .get(id)
      .then((data) => {
        setProject(data.project);
        setIsLoading(false);

        // Check if following (separate call to avoid blocking page load)
        followsApi.check(id).then((data) => {
          setIsFollowing(data.following);
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to load project");
        setIsLoading(false);
      });
  }, [id]);

  const toggleFollow = useCallback(async () => {
    if (!id || isTogglingFollow) return;

    setIsTogglingFollow(true);
    try {
      if (isFollowing) {
        await followsApi.remove(id);
        setIsFollowing(false);
      } else {
        await followsApi.add(id);
        setIsFollowing(true);
      }
    } catch {
      // Silently fail - could add error toast later
    }
    setIsTogglingFollow(false);
  }, [id, isFollowing, isTogglingFollow]);

  if (isLoading) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container">
        <p className={styles.message}>{error || "Project not found"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.layout}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{project.title}</h1>
            <Badge variant="muted">{project.status}</Badge>
          </div>

          <div className={styles.creator}>
            <Link
              to={`/people/${project.creator.handle}`}
              className={styles.creatorLink}
            >
              <Portrait
                src={project.creator.portraitUrl}
                alt={project.creator.name}
                size="sm"
              />
              <span>{project.creator.name}</span>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          {project.description && (
            <section className={styles.section}>
              <p className={styles.description}>{project.description}</p>
            </section>
          )}

          {/* Links */}
          {(project.websiteUrl || project.repoUrl) && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Links</h2>
              <nav className={styles.links}>
                {project.websiteUrl && (
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Visit website
                  </a>
                )}
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    View source
                  </a>
                )}
              </nav>
            </section>
          )}
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <button
            className={`${styles.actionButton} ${isFollowing ? styles.actionButtonActive : ""}`}
            onClick={toggleFollow}
            disabled={isTogglingFollow}
          >
            {isFollowing ? "Unfollow project" : "Follow project"}
          </button>
        </aside>
      </div>
    </div>
  );
}
