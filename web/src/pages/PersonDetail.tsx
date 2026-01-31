import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Portrait } from "../components/ui";
import { profiles as profilesApi, projects as projectsApi, favorites as favoritesApi } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Profile, ProjectListItem } from "../data/types";
import styles from "./PersonDetail.module.css";

export function PersonDetailPage() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  usePageTitle(profile?.name ?? "Profile");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;

    setIsLoading(true);
    setError(null);

    // Fetch profile, projects, and favorite status in parallel
    Promise.all([profilesApi.get(handle), projectsApi.list()])
      .then(([profileData, projectsData]) => {
        setProfile(profileData.profile);
        // Filter projects by this creator
        const creatorProjects = projectsData.projects.filter(
          (p) => p.creator.handle === handle
        );
        setProjects(creatorProjects);
        setIsLoading(false);

        // Check if favorited (separate call to avoid blocking page load)
        favoritesApi.check(profileData.profile.id).then((data) => {
          setIsFavorited(data.favorited);
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile");
        setIsLoading(false);
      });
  }, [handle]);

  const toggleFavorite = useCallback(async () => {
    if (!profile || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    setFavoriteError(null);
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    try {
      if (wasFavorited) {
        await favoritesApi.remove(profile.id);
      } else {
        await favoritesApi.add(profile.id);
      }
    } catch {
      setIsFavorited(wasFavorited);
      setFavoriteError("Failed to update favorite. Please try again.");
      setTimeout(() => setFavoriteError(null), 3000);
    }
    setIsTogglingFavorite(false);
  }, [profile, isFavorited, isTogglingFavorite]);

  if (isLoading) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container">
        <p className={styles.message}>{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.layout}>
        {/* Profile Header */}
        <aside className={styles.sidebar}>
          <Portrait
            src={profile.portraitUrl}
            alt={profile.name}
            size="xl"
            className={styles.portrait}
          />

          <div className={styles.info}>
            <h1 className={styles.name}>{profile.name}</h1>
            <p className={styles.handle}>@{profile.handle}</p>
            {profile.location && (
              <p className={styles.location}>{profile.location}</p>
            )}
          </div>

          {/* External Links */}
          <nav className={styles.links}>
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Website
              </a>
            )}
            {profile.twitterHandle && (
              <a
                href={`https://twitter.com/${profile.twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Twitter
              </a>
            )}
            {profile.githubHandle && (
              <a
                href={`https://github.com/${profile.githubHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                LinkedIn
              </a>
            )}
          </nav>

          <button
            className={`${styles.actionButton} ${isFavorited ? styles.actionButtonActive : ""}`}
            onClick={toggleFavorite}
            disabled={isTogglingFavorite}
          >
            {isFavorited ? "Remove from favorites" : "Add to favorites"}
          </button>
          {favoriteError && <p className={styles.error}>{favoriteError}</p>}
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {profile.bio && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.bio}>{profile.bio}</p>
            </section>
          )}

          {projects.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Projects</h2>
              <div className={styles.projectsList}>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={styles.projectCard}
                  >
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    {project.description && (
                      <p className={styles.projectDescription}>
                        {project.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
