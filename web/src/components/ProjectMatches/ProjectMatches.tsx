import { Link } from "react-router-dom";
import { Portrait } from "../ui";
import { useProjectMatches } from "../../hooks/queries";
import styles from "./ProjectMatches.module.css";

interface ProjectMatchesProps {
  projectId: string;
}

/**
 * Shows approved people whose skills overlap a project's needs. Renders nothing
 * until matches load and only when there is at least one — keeps the project
 * card uncluttered when there are no needs set or no matches yet.
 */
export function ProjectMatches({ projectId }: ProjectMatchesProps) {
  const { data: people = [], isPending } = useProjectMatches(projectId);

  if (isPending || people.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>People who can help ({people.length})</h3>
      <div className={styles.list}>
        {people.map((person) => (
          <Link
            key={person.id}
            to={`/people/${person.handle}`}
            className={styles.person}
          >
            <Portrait src={person.portraitUrl} alt={person.name} size="sm" />
            <div className={styles.personInfo}>
              <span className={styles.personName}>{person.name}</span>
              <span className={styles.personSkills}>
                {person.matchedSkills.map((s) => s.name).join(", ")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
