import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { admin as adminApi, type AdminProfile } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./ApprovalQueue.module.css";

export function ApprovalQueuePage() {
  usePageTitle("Approval Queue");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await adminApi.pendingProfiles();
      setProfiles(data.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  if (isLoading) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  return (
    <div>
      <header className={styles.header}>
        <h2 className={styles.title}>Approval Queue</h2>
        <span className={styles.count}>
          {profiles.length} pending
        </span>
      </header>

      {profiles.length === 0 ? (
        <div className={styles.empty}>
          <p>No profiles pending review.</p>
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
