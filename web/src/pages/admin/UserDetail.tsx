import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { admin as adminApi, type AdminUserDetail } from "../../lib/api";
import styles from "./UserDetail.module.css";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    adminApi
      .getUser(id)
      .then((data) => {
        setUser(data.user);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load user");
        setIsLoading(false);
      });
  }, [id]);

  const handleSuspend = useCallback(async () => {
    if (!id) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { user: updated } = await adminApi.suspendUser(id);
      setUser((prev) => (prev ? { ...prev, status: updated.status } : prev));
      setConfirmAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend");
    } finally {
      setIsSubmitting(false);
    }
  }, [id]);

  const handleReinstate = useCallback(async () => {
    if (!id) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { user: updated } = await adminApi.reinstateUser(id);
      setUser((prev) => (prev ? { ...prev, status: updated.status } : prev));
      setConfirmAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reinstate");
    } finally {
      setIsSubmitting(false);
    }
  }, [id]);

  const handleRemoveProject = useCallback(async (projectId: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await adminApi.removeProject(projectId);
      setUser((prev) => {
        if (!prev?.profile) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            projectsCreated: prev.profile.projectsCreated.map((p) =>
              p.id === projectId ? { ...p, status: "archived" } : p
            ),
          },
        };
      });
      setConfirmAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove project");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleRemoveJob = useCallback(async (jobId: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await adminApi.removeJob(jobId);
      setUser((prev) => {
        if (!prev?.profile) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            jobsPosted: prev.profile.jobsPosted.map((j) =>
              j.id === jobId ? { ...j, active: false } : j
            ),
          },
        };
      });
      setConfirmAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove job");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (isLoading) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error && !user) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!user) {
    return <p className={styles.message}>User not found</p>;
  }

  const isSuspended = user.status === "suspended";

  return (
    <div>
      <header className={styles.header}>
        <Link to="/admin/users" className={styles.backLink}>
          &larr; Users
        </Link>
        <h2 className={styles.title}>User Detail</h2>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.content}>
        {/* User Info */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Account</h3>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>{user.email}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Status</span>
              <span
                className={
                  isSuspended ? styles.valueDanger : styles.value
                }
              >
                {user.status}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Joined</span>
              <span className={styles.value}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            {user.lastLoginAt && (
              <div className={styles.row}>
                <span className={styles.label}>Last login</span>
                <span className={styles.value}>
                  {new Date(user.lastLoginAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className={styles.row}>
              <span className={styles.label}>Flags</span>
              <span className={styles.value}>
                {user.isAdmin && <span className={styles.flag}>Admin</span>}
                {user.isEmployer && <span className={styles.flag}>Employer</span>}
                {!user.isAdmin && !user.isEmployer && <span className={styles.noFlags}>None</span>}
              </span>
            </div>
          </div>

          {/* Suspend/Reinstate actions */}
          {!user.isAdmin && (
            <div className={styles.actions}>
              {confirmAction === "suspend" ? (
                <div className={styles.confirmBox}>
                  <span>Suspend this user?</span>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.dangerButton}
                    onClick={handleSuspend}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Suspending..." : "Confirm"}
                  </button>
                </div>
              ) : confirmAction === "reinstate" ? (
                <div className={styles.confirmBox}>
                  <span>Reinstate this user?</span>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={handleReinstate}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Reinstating..." : "Confirm"}
                  </button>
                </div>
              ) : isSuspended ? (
                <button
                  className={styles.primaryButton}
                  onClick={() => setConfirmAction("reinstate")}
                >
                  Reinstate User
                </button>
              ) : (
                <button
                  className={styles.dangerButton}
                  onClick={() => setConfirmAction("suspend")}
                >
                  Suspend User
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        {user.profile && (
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Profile</h3>
            <div className={styles.profileInfo}>
              <Portrait
                src={user.profile.portraitUrl}
                alt={user.profile.name}
                size="lg"
              />
              <div>
                <p className={styles.profileName}>{user.profile.name}</p>
                <p className={styles.profileHandle}>@{user.profile.handle}</p>
                <p className={styles.profileStatus}>
                  Status: {user.profile.approvalStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        {user.profile && user.profile.projectsCreated.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
              Projects ({user.profile.projectsCreated.length})
            </h3>
            <div className={styles.list}>
              {user.profile.projectsCreated.map((project) => (
                <div key={project.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{project.title}</span>
                    <span
                      className={
                        project.status === "archived"
                          ? styles.listStatusRemoved
                          : styles.listStatus
                      }
                    >
                      {project.status}
                    </span>
                  </div>
                  {project.status !== "archived" && (
                    <>
                      {confirmAction === `remove-project-${project.id}` ? (
                        <div className={styles.confirmInline}>
                          <button
                            className={styles.cancelButton}
                            onClick={() => setConfirmAction(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className={styles.dangerButton}
                            onClick={() => handleRemoveProject(project.id)}
                            disabled={isSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.removeButton}
                          onClick={() =>
                            setConfirmAction(`remove-project-${project.id}`)
                          }
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs */}
        {user.profile && user.profile.jobsPosted.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
              Jobs ({user.profile.jobsPosted.length})
            </h3>
            <div className={styles.list}>
              {user.profile.jobsPosted.map((job) => (
                <div key={job.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{job.title}</span>
                    <span className={styles.listMeta}>{job.companyName}</span>
                    <span
                      className={
                        !job.active
                          ? styles.listStatusRemoved
                          : styles.listStatus
                      }
                    >
                      {job.active ? "Active" : "Removed"}
                    </span>
                  </div>
                  {job.active && (
                    <>
                      {confirmAction === `remove-job-${job.id}` ? (
                        <div className={styles.confirmInline}>
                          <button
                            className={styles.cancelButton}
                            onClick={() => setConfirmAction(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className={styles.dangerButton}
                            onClick={() => handleRemoveJob(job.id)}
                            disabled={isSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.removeButton}
                          onClick={() =>
                            setConfirmAction(`remove-job-${job.id}`)
                          }
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
