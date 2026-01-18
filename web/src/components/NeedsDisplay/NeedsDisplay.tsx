import { useState, useEffect } from "react";
import { projects as projectsApi } from "../../lib/api";
import type { ProjectNeed } from "../../data/types";
import styles from "./NeedsDisplay.module.css";

interface NeedsDisplayProps {
  projectId: string;
}

export function NeedsDisplay({ projectId }: NeedsDisplayProps) {
  const [needs, setNeeds] = useState<ProjectNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    projectsApi
      .getNeeds(projectId)
      .then((data) => setNeeds(data.needs))
      .catch(() => {
        // Silently fail - needs might not be accessible
      })
      .finally(() => setIsLoading(false));
  }, [projectId]);

  if (isLoading) {
    return null;
  }

  if (needs.length === 0) {
    return null;
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Project Needs</h2>
      <p className={styles.subtitle}>Ways you can help this project</p>

      <div className={styles.list}>
        {needs.map((need) => (
          <div key={need.categoryId} className={styles.need}>
            <h3 className={styles.categoryName}>{need.category.name}</h3>
            <ul className={styles.options}>
              {need.options.map((option) => (
                <li key={option.id} className={styles.option}>
                  {option.name}
                </li>
              ))}
            </ul>
            {need.contextText && (
              <p className={styles.context}>{need.contextText}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
