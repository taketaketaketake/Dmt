import { useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Portrait } from "../components/ui";
import {
  useProfile,
  useProjectsByCreator,
  useMatchingProjects,
  useFavoriteStatus,
  useToggleFavorite,
} from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./PersonDetail.module.css";

export function PersonDetailPage() {
  const { handle } = useParams<{ handle: string }>();
  const { data: profile, isPending, error } = useProfile(handle);
  usePageTitle(profile?.name ?? "Profile");
  // Projects are filtered server-side by creator, so we don't download the
  // whole directory just to render one person's work.
  const { data: projects = [] } = useProjectsByCreator(handle);
  const { data: matchingProjects = [] } = useMatchingProjects(handle);
  const { data: isFavorited = false } = useFavoriteStatus(profile?.id);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = useCallback(() => {
    if (!profile || toggleFavorite.isPending) return;
    toggleFavorite.mutate({ profileId: profile.id, favorited: isFavorited });
  }, [profile, isFavorited, toggleFavorite]);

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Profile not found"}</p>
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
            onClick={handleToggleFavorite}
            disabled={toggleFavorite.isPending}
          >
            {isFavorited ? "Remove from favorites" : "Add to favorites"}
          </button>
          {toggleFavorite.isError && (
            <p className={styles.error}>Failed to update favorite. Please try again.</p>
          )}
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {profile.bio && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.bio}>{profile.bio}</p>
            </section>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className={styles.skills}>
                {profile.skills.map((skill) => (
                  <span key={skill.id} className={styles.skill}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {matchingProjects.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Projects looking for these skills</h2>
              <div className={styles.projectsList}>
                {matchingProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={styles.projectCard}
                  >
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    <div className={styles.matchTags}>
                      {project.matchedSkills.map((s) => (
                        <span key={s.id} className={styles.matchTag}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
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
