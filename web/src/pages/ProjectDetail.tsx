import { useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Portrait, Badge } from "../components/ui";
import { NeedsDisplay } from "../components/NeedsDisplay";
import { useAuth } from "../contexts";
import { useProject, useFollowStatus, useToggleFollow } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ProjectDetail.module.css";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { data: project, isPending, error } = useProject(id);
  usePageTitle(project?.title ?? "Project");
  // Follow status only applies to authenticated members; the check can 403 for
  // not-yet-approved users, so the hook keeps retries off and we gate on auth.
  const { data: isFollowing = false } = useFollowStatus(id, { enabled: isAuthenticated });
  const toggleFollow = useToggleFollow();

  const handleToggleFollow = useCallback(() => {
    if (!id || toggleFollow.isPending) return;
    toggleFollow.mutate({ projectId: id, following: isFollowing });
  }, [id, isFollowing, toggleFollow]);

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Project not found"}</p>
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

          {project.categories && project.categories.length > 0 && (
            <div className={styles.categories}>
              {project.categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/projects?category=${encodeURIComponent(category.slug)}`}
                  className={styles.categoryLink}
                  aria-label={`View projects in ${category.name}`}
                >
                  <Badge>{category.name}</Badge>
                </Link>
              ))}
            </div>
          )}
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

          {/* Project Needs */}
          {id && <NeedsDisplay projectId={id} />}
        </main>

        {/* Sidebar */}
        {isAuthenticated && (
          <aside className={styles.sidebar}>
            <button
              className={`${styles.actionButton} ${isFollowing ? styles.actionButtonActive : ""}`}
              onClick={handleToggleFollow}
              disabled={toggleFollow.isPending}
            >
              {isFollowing ? "Unfollow project" : "Follow project"}
            </button>
            {toggleFollow.isError && (
              <p className={styles.error}>Failed to update follow. Please try again.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
