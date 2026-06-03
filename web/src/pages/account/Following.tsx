import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui";
import { useFollowsList, useRemoveFollow } from "../../hooks/queries";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Following.module.css";

export function FollowingPage() {
  usePageTitle("Following");
  const { data: follows = [], isPending, error } = useFollowsList();
  const removeMutation = useRemoveFollow();
  const removingId = removeMutation.isPending ? removeMutation.variables : undefined;
  const unfollowError = removeMutation.isError;

  const unfollow = useCallback(
    (projectId: string) => {
      removeMutation.mutate(projectId);
    },
    [removeMutation]
  );

  if (isPending) {
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
        <p className={styles.message}>{error.message || "Failed to load follows"}</p>
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

      {unfollowError && (
        <p className={styles.error}>Failed to unfollow. Please try again.</p>
      )}

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
                disabled={removingId === follow.project.id}
              >
                {removingId === follow.project.id ? "Removing..." : "Unfollow"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
