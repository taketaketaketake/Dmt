import { Link } from "react-router-dom";
import { Badge } from "../components/ui";
import { useJobsList } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Jobs.module.css";

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

export function JobsPage() {
  usePageTitle("Jobs");
  const { data: jobs = [], isPending, error } = useJobsList();

  if (isPending) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Jobs</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Jobs</h1>
        </header>
        <p className={styles.message}>{error.message || "Failed to load jobs"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>Jobs</h1>
        <p className={styles.subtitle}>
          {jobs.length} open position{jobs.length !== 1 ? "s" : ""} from verified employers
        </p>
      </header>

      {jobs.length === 0 ? (
        <p className={styles.message}>No open positions.</p>
      ) : (
        <div className={styles.list}>
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className={styles.card}
            >
              <div className={styles.cardMain}>
                <h2 className={styles.jobTitle}>{job.title}</h2>
                <p className={styles.company}>{job.companyName}</p>
                <p className={styles.poster}>
                  Posted by @{job.poster.handle}
                </p>
              </div>

              <div className={styles.cardMeta}>
                <Badge>{jobTypeLabels[job.type]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
