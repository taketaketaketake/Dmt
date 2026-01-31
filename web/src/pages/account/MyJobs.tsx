import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui";
import { jobs as jobsApi } from "../../lib/api";
import { useAuth } from "../../contexts";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { Job, JobType } from "../../data/types";
import styles from "./MyJobs.module.css";

type JobFormData = {
  title: string;
  companyName: string;
  description: string;
  type: JobType;
  applyUrl: string;
  expiresAt: string;
};

const emptyForm: JobFormData = {
  title: "",
  companyName: "",
  description: "",
  type: "full_time",
  applyUrl: "",
  expiresAt: "",
};

function jobToForm(job: Job): JobFormData {
  return {
    title: job.title,
    companyName: job.companyName,
    description: job.description || "",
    type: job.type,
    applyUrl: job.applyUrl,
    expiresAt: job.expiresAt ? job.expiresAt.split("T")[0] : "",
  };
}

const jobTypeLabels: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

export function MyJobsPage() {
  usePageTitle("My Jobs");
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<JobFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isEmployer = user?.isEmployer;

  const loadJobs = useCallback(async () => {
    try {
      const data = await jobsApi.mine();
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    }
  }, []);

  useEffect(() => {
    loadJobs().then(() => setIsLoading(false));
  }, [loadJobs]);

  const handleChange = useCallback((field: keyof JobFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.companyName.trim() || !form.applyUrl.trim()) {
      setError("Title, company name, and apply URL are required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { job } = await jobsApi.create({
        title: form.title.trim(),
        companyName: form.companyName.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        applyUrl: form.applyUrl.trim(),
        expiresAt: form.expiresAt || undefined,
      });
      setJobs((prev) => [job, ...prev]);
      setForm(emptyForm);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  const handleUpdate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    if (!form.title.trim() || !form.companyName.trim() || !form.applyUrl.trim()) {
      setError("Title, company name, and apply URL are required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { job } = await jobsApi.update(editingJob.id, {
        title: form.title.trim(),
        companyName: form.companyName.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        applyUrl: form.applyUrl.trim(),
        expiresAt: form.expiresAt || undefined,
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? job : j))
      );
      setEditingJob(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingJob, form]);

  const handleDelete = useCallback(async (id: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await jobsApi.delete(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const startEdit = useCallback((job: Job) => {
    setEditingJob(job);
    setForm(jobToForm(job));
    setIsCreating(false);
    setError(null);
  }, []);

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setEditingJob(null);
    setForm(emptyForm);
    setError(null);
  }, []);

  const cancelForm = useCallback(() => {
    setIsCreating(false);
    setEditingJob(null);
    setForm(emptyForm);
    setError(null);
  }, []);

  if (isLoading) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>My Jobs</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  // Show form when creating or editing
  if (isCreating || editingJob) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {editingJob ? "Edit Job" : "Post New Job"}
          </h1>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formCard}>
          <form className={styles.form} onSubmit={editingJob ? handleUpdate : handleCreate}>
            <div className={styles.field}>
              <label className={styles.label}>Job Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Company Name *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="Your company name"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={6}
                placeholder="Describe the role, requirements, and benefits"
                className={styles.textarea}
              />
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Job Type</label>
                <select
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  className={styles.select}
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Expires On</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => handleChange("expiresAt", e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Apply URL *</label>
              <input
                type="url"
                value={form.applyUrl}
                onChange={(e) => handleChange("applyUrl", e.target.value)}
                placeholder="https://..."
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={cancelForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingJob
                  ? "Save changes"
                  : "Post job"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>My Jobs</h1>
        {isEmployer && (
          <button className={styles.newButton} onClick={startCreate}>
            Post job
          </button>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {!isEmployer && (
        <p className={styles.notice}>
          An employer subscription is required to post jobs.
        </p>
      )}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            You haven't posted any jobs yet.
          </p>
          {!isEmployer && (
            <p className={styles.emptyHint}>
              Requires an employer subscription.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.jobTitle}>{job.title}</h2>
                  <Badge variant="muted">{jobTypeLabels[job.type]}</Badge>
                </div>
                <p className={styles.company}>{job.companyName}</p>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.editButton}
                  onClick={() => startEdit(job)}
                >
                  Edit
                </button>
                <Link
                  to={`/jobs/${job.id}`}
                  className={styles.viewLink}
                >
                  View
                </Link>
                {deleteConfirm === job.id ? (
                  <>
                    <button
                      className={styles.deleteConfirm}
                      onClick={() => handleDelete(job.id)}
                      disabled={isSubmitting}
                    >
                      Confirm delete
                    </button>
                    <button
                      className={styles.cancelDelete}
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.deleteButton}
                    onClick={() => setDeleteConfirm(job.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
