import { Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { usePendingProfiles } from "../../hooks/queries";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./ApprovalQueue.module.css";

export function ApprovalQueuePage() {
  usePageTitle("Pending Users");
  const { data: profiles = [], isPending, error } = usePendingProfiles();

  if (isPending) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error.message || "Failed to load queue"}</p>;
  }

  return (
    <div>
      <header className={styles.header}>
        <h2 className={styles.title}>Pending Users</h2>
        <span className={styles.count}>
          {profiles.length} pending
        </span>
      </header>

      {profiles.length === 0 ? (
        <div className={styles.empty}>
          <p>No users pending review.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/admin/queue/${profile.id}`}
              className={styles.card}
            >
              <Portrait
                src={profile.portraitUrl}
                alt={profile.name}
                size="md"
              />
              <div className={styles.cardContent}>
                <div className={styles.cardMain}>
                  <span className={styles.name}>{profile.name}</span>
                  <span className={styles.handle}>@{profile.handle}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.email}>{profile.user.email}</span>
                  <span className={styles.date}>
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className={styles.arrow}>&rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
