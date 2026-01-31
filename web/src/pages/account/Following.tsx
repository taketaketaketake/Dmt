import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui";
import { follows as followsApi, type FollowItem } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Following.module.css";

export function FollowingPage() {
  usePageTitle("Following");
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [unfollowError, setUnfollowError] = useState<string | null>(null);

  useEffect(() => {
    followsApi
      .list()
      .then((data) => {
        setFollows(data.follows);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load follows");
        setIsLoading(false);
      });
  }, []);

  const unfollow = useCallback(async (projectId: string) => {
    setRemovingIds((prev) => new Set(prev).add(projectId));
    setUnfollowError(null);
    try {
      await followsApi.remove(projectId);
      setFollows((prev) => prev.filter((f) => f.project.id !== projectId));
    } catch {
      setUnfollowError("Failed to unfollow. Please try again.");
      setTimeout(() => setUnfollowError(null), 3000);
    }
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Following</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Following</h1>
        </header>
        <p className={styles.message}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Following</h1>
        <p className={styles.subtitle}>
          {follows.length} project{follows.length !== 1 ? "s" : ""} followed
        </p>
      </header>

      {unfollowError && <p className={styles.error}>{unfollowError}</p>}

      {follows.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            No projects followed yet. Browse and follow projects you want to track.
          </p>
          <Link to="/projects" className={styles.browseLink}>
            Browse projects
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {follows.map((follow) => (
            <div key={follow.id} className={styles.card}>
              <Link
                to={`/projects/${follow.project.id}`}
                className={styles.projectLink}
              >
                <div className={styles.projectInfo}>
                  <div className={styles.projectHeader}>
                    <p className={styles.projectTitle}>{follow.project.title}</p>
                    <Badge variant="muted">{follow.project.status}</Badge>
                  </div>
                  {follow.project.description && (
                    <p className={styles.description}>{follow.project.description}</p>
                  )}
                  <p className={styles.creator}>by {follow.project.creator.name}</p>
                </div>
              </Link>

              <button
                className={styles.unfollowButton}
                onClick={() => unfollow(follow.project.id)}
                disabled={removingIds.has(follow.project.id)}
              >
                {removingIds.has(follow.project.id) ? "Removing..." : "Unfollow"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
