import { useParams, Link } from "react-router-dom";
import { Portrait, Badge } from "../components/ui";
import { useJob } from "../hooks/queries";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./JobDetail.module.css";

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isPending, error } = useJob(id);
  usePageTitle(job?.title ?? "Job");

  if (isPending) {
    return (
      <div className="container">
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container">
        <p className={styles.message}>{error?.message || "Job not found"}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.layout}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.meta}>
            <Badge>{jobTypeLabels[job.type]}</Badge>
          </div>
          <h1 className={styles.title}>{job.title}</h1>
          <p className={styles.company}>{job.companyName}</p>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          {job.description && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>About this role</h2>
              <p className={styles.description}>{job.description}</p>
            </section>
          )}

          {/* Apply */}
          <section className={styles.section}>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.applyButton}
            >
              Apply for this position
            </a>
          </section>
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.posterSection}>
            <h2 className={styles.sectionTitle}>Posted by</h2>
            <Link
              to={`/people/${job.poster.handle}`}
              className={styles.posterLink}
            >
              <Portrait
                src={job.poster.portraitUrl}
                alt={job.poster.name}
                size="md"
              />
              <div>
                <p className={styles.posterName}>{job.poster.name}</p>
                <p className={styles.posterHandle}>@{job.poster.handle}</p>
              </div>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
