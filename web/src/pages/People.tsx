import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../components/ui";
import { profiles as profilesApi } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ProfileListItem } from "../data/types";
import styles from "./People.module.css";

export function PeoplePage() {
  usePageTitle("People");
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profilesApi
      .list()
      .then((data) => {
        setProfiles(data.profiles);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profiles");
        setIsLoading(false);
      });
  }, []);

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
          {profiles.length} builder{profiles.length !== 1 ? "s" : ""} in the directory
        </p>
      </header>

      {profiles.length === 0 ? (
        <p className={styles.message}>No profiles yet.</p>
      ) : (
        <div className={styles.grid}>
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/people/${profile.handle}`}
              className={styles.card}
            >
              <Portrait
                src={profile.portraitUrl}
                alt={profile.name}
                size="lg"
              />
              <div className={styles.cardContent}>
                <h2 className={styles.name}>{profile.name}</h2>
                <p className={styles.handle}>@{profile.handle}</p>
                {profile.bio && (
                  <p className={styles.bio}>{profile.bio}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
