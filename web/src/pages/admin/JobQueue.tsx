import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { admin as adminApi, type AdminJob } from "../../lib/api";
import { usePendingJobs, queryKeys } from "../../hooks/queries";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminOutlet } from "./adminOutlet";
import styles from "./JobQueue.module.css";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

export function JobQueuePage() {
  usePageTitle("Pending Jobs");
  const { refreshStats } = useAdminOutlet();
  const queryClient = useQueryClient();
  const { data: jobs = [], isPending, error } = usePendingJobs();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reflect a moderation decision: drop it from the pending list and refresh
  // the public jobs board + tab badge counts.
  const afterModeration = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.pendingJobs });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list });
    refreshStats();
  }, [queryClient, refreshStats]);

  const handleApprove = useCallback(
    async (job: AdminJob) => {
      setActionError(null);
      setActionId(job.id);
      try {
        await adminApi.approveJob(job.id);
        afterModeration();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to approve job"
        );
      } finally {
        setActionId(null);
      }
    },
    [afterModeration]
  );

  const handleReject = useCallback(
    async (job: AdminJob) => {
      if (
        !window.confirm(
          `Reject and take down "${job.title}" at ${job.companyName}? This removes it from the public directory.`
        )
      ) {
        return;
      }
      setActionError(null);
      setActionId(job.id);
      try {
        await adminApi.rejectJob(job.id);
        afterModeration();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to reject job"
        );
      } finally {
        setActionId(null);
      }
    },
    [afterModeration]
  );

  if (isPending) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error.message || "Failed to load queue"}</p>;
  }

  return (
    <div>
      <header className={styles.header}>
        <h2 className={styles.title}>Pending Jobs</h2>
        <span className={styles.count}>{jobs.length} pending</span>
      </header>

      {actionError && <p className={styles.error}>{actionError}</p>}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <p>No jobs pending review.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {jobs.map((job) => {
            const busy = actionId === job.id;
            return (
              <div key={job.id} className={styles.card}>
                <div className={styles.cardContent}>
                  <div className={styles.cardMain}>
                    <span className={styles.jobTitle}>{job.title}</span>
                    <span className={styles.company}>{job.companyName}</span>
                    <span className={styles.type}>
                      {JOB_TYPE_LABELS[job.type] ?? job.type}
                    </span>
                  </div>
                  {job.description && (
                    <p className={styles.description}>{job.description}</p>
                  )}
                  <div className={styles.cardMeta}>
                    <span className={styles.poster}>
                      {job.poster.name} (@{job.poster.handle})
                    </span>
                    <span className={styles.email}>{job.poster.user.email}</span>
                    <span className={styles.date}>
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <a
                      className={styles.applyLink}
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apply link &rarr;
                    </a>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approve}
                    onClick={() => handleApprove(job)}
                    disabled={busy}
                  >
                    {busy ? "..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className={styles.reject}
                    onClick={() => handleReject(job)}
                    disabled={busy}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
