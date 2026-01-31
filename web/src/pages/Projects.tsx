import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Portrait, Badge } from "../components/ui";
import { projects as projectsApi } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ProjectListItem } from "../data/types";
import styles from "./Projects.module.css";

export function ProjectsPage() {
  usePageTitle("Projects");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectsApi
      .list()
      .then((data) => {
        setProjects(data.projects);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load projects");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
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
        <p className={styles.message}>{error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <p className={styles.subtitle}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} from Detroit builders
        </p>
      </header>

      {projects.length === 0 ? (
        <p className={styles.message}>No projects yet.</p>
      ) : (
        <div className={styles.list}>
          {projects.map((project) => (
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
