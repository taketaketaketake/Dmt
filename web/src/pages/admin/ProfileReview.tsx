import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { admin as adminApi, type AdminProfile } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./ProfileReview.module.css";

export function ProfileReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  usePageTitle(profile ? `Review: ${profile.name}` : "Profile Review");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    if (!id) return;

    adminApi
      .getProfile(id)
      .then((data) => {
        setProfile(data.profile);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile");
        setIsLoading(false);
      });
  }, [id]);

  const handleApprove = useCallback(async () => {
    if (!id) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await adminApi.approveProfile(id);
      navigate("/admin/queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
      setIsSubmitting(false);
    }
  }, [id, navigate]);

  const handleReject = useCallback(async () => {
    if (!id) return;
    if (!rejectNote.trim()) {
      setError("Please provide a rejection note");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await adminApi.rejectProfile(id, rejectNote.trim());
      navigate("/admin/queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
      setIsSubmitting(false);
    }
  }, [id, navigate, rejectNote]);

  if (isLoading) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error && !profile) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!profile) {
    return <p className={styles.message}>Profile not found</p>;
  }

  const isPending = profile.approvalStatus === "pending_review";

  return (
    <div>
      <header className={styles.header}>
        <Link to="/admin/queue" className={styles.backLink}>
          &larr; Queue
        </Link>
        <h2 className={styles.title}>Review Profile</h2>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.content}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.portraitSection}>
            <Portrait
              src={profile.portraitUrl}
              alt={profile.name}
              size="xl"
            />
          </div>

          <div className={styles.info}>
            <h3 className={styles.name}>{profile.name}</h3>
            <p className={styles.handle}>@{profile.handle}</p>

            {profile.location && (
              <p className={styles.location}>{profile.location}</p>
            )}

            {profile.bio && (
              <p className={styles.bio}>{profile.bio}</p>
            )}

            <div className={styles.links}>
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
                  @{profile.twitterHandle}
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
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className={styles.userCard}>
          <h4 className={styles.sectionTitle}>User</h4>
          <div className={styles.userInfo}>
            <div className={styles.userRow}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>{profile.user.email}</span>
            </div>
            <div className={styles.userRow}>
              <span className={styles.label}>Status</span>
              <span className={styles.value}>{profile.user.status || "pending"}</span>
            </div>
            <div className={styles.userRow}>
              <span className={styles.label}>Joined</span>
              <span className={styles.value}>
                {new Date(profile.user.createdAt).toLocaleDateString()}
              </span>
            </div>
            {profile.user.lastLoginAt && (
              <div className={styles.userRow}>
                <span className={styles.label}>Last login</span>
                <span className={styles.value}>
                  {new Date(profile.user.lastLoginAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className={styles.actions}>
            {showRejectForm ? (
              <div className={styles.rejectForm}>
                <label className={styles.rejectLabel}>
                  Rejection note (required)
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why the profile is being rejected..."
                  rows={3}
                  className={styles.rejectTextarea}
                />
                <div className={styles.rejectActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectNote("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.rejectConfirmButton}
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectNote.trim()}
                  >
                    {isSubmitting ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.rejectButton}
                  onClick={() => setShowRejectForm(true)}
                  disabled={isSubmitting}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className={styles.approveButton}
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Approving..." : "Approve"}
                </button>
              </>
            )}
          </div>
        )}

        {!isPending && (
          <div className={styles.statusBanner}>
            Profile status: <strong>{profile.approvalStatus}</strong>
            {profile.rejectionNote && (
              <p className={styles.rejectionNote}>
                Note: {profile.rejectionNote}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
