import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from "react";
import { Portrait } from "../../components/ui";
import { useAuth } from "../../contexts";
import { profiles as profilesApi, uploads as uploadsApi, ApiError } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { Profile } from "../../data/types";
import styles from "./Profile.module.css";

type FormData = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  websiteUrl: string;
  twitterHandle: string;
  githubHandle: string;
  linkedinUrl: string;
};

const emptyForm: FormData = {
  name: "",
  handle: "",
  bio: "",
  location: "",
  websiteUrl: "",
  twitterHandle: "",
  githubHandle: "",
  linkedinUrl: "",
};

function profileToForm(profile: Profile): FormData {
  return {
    name: profile.name,
    handle: profile.handle,
    bio: profile.bio || "",
    location: profile.location || "",
    websiteUrl: profile.websiteUrl || "",
    twitterHandle: profile.twitterHandle || "",
    githubHandle: profile.githubHandle || "",
    linkedinUrl: profile.linkedinUrl || "",
  };
}

function StatusBadge({ status }: { status: Profile["approvalStatus"] }) {
  const labels: Record<Profile["approvalStatus"], string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return <span className={styles.status}>{labels[status]}</span>;
}

function StatusMessage({ status }: { status: Profile["approvalStatus"] }) {
  const messages: Record<Profile["approvalStatus"], string> = {
    draft: "Your profile is a draft. Submit it for review to appear in the directory.",
    pending_review: "Your profile is under review. You'll be notified once it's approved.",
    approved: "Your profile is live in the directory. You can update your bio and links freely. Changing your name, handle, or photo will require re-approval.",
    rejected: "Your profile was rejected. Please update it and resubmit.",
  };
  return <p className={styles.statusMessage}>{messages[status]}</p>;
}

export function ProfilePage() {
  usePageTitle("My Profile");
  const { profile: authProfile, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authProfile) {
      setIsLoading(false);
      setMode("create");
      return;
    }

    profilesApi
      .me()
      .then((data) => {
        setProfile(data.profile);
        setForm(profileToForm(data.profile));
        setMode("view");
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setMode("create");
          setIsLoading(false);
        } else {
          setError(err.message || "Failed to load profile");
          setIsLoading(false);
        }
      });
  }, [authProfile]);

  // Allow editing for draft, rejected, and approved profiles
  // Pending review cannot be edited
  const canEdit = profile && profile.approvalStatus !== "pending_review";
  const canSubmit = profile && profile.approvalStatus === "draft";
  const isApproved = profile?.approvalStatus === "approved";

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.handle.trim()) {
      setError("Name and handle are required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { profile: newProfile } = await profilesApi.create({
        name: form.name.trim(),
        handle: form.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: form.bio.trim() || undefined,
        location: form.location.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        twitterHandle: form.twitterHandle.trim() || undefined,
        githubHandle: form.githubHandle.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
      });
      setProfile(newProfile);
      setForm(profileToForm(newProfile));
      setMode("view");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, refresh]);

  const handleUpdate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.handle.trim()) {
      setError("Name and handle are required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await profilesApi.update({
        name: form.name.trim(),
        handle: form.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: form.bio.trim() || undefined,
        location: form.location.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        twitterHandle: form.twitterHandle.trim() || undefined,
        githubHandle: form.githubHandle.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
      });
      setProfile(response.profile);
      setForm(profileToForm(response.profile));
      setMode("view");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, refresh]);

  const handleSubmitForReview = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { profile: updated } = await profilesApi.submit();
      setProfile(updated);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for review");
    } finally {
      setIsSubmitting(false);
    }
  }, [refresh]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const { url } = await uploadsApi.image(file, "portrait");
      // Update profile with new portrait URL
      const { profile: updated } = await profilesApi.update({ portraitUrl: url });
      setProfile(updated);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [refresh]);

  const handleChangePhotoClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (isLoading) {
    return <p className={styles.message}>Loading...</p>;
  }

  // Create mode - no profile exists
  if (mode === "create" && !profile) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Create Profile</h1>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.field}>
              <label className={styles.label}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your full name"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Handle *</label>
              <div className={styles.handleInput}>
                <span className={styles.handlePrefix}>@</span>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => handleChange("handle", e.target.value)}
                  placeholder="yourhandle"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Corktown"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
                placeholder="Tell us about yourself and what you're building"
                className={styles.textarea}
              />
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Website</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => handleChange("websiteUrl", e.target.value)}
                  placeholder="https://"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Twitter</label>
                <input
                  type="text"
                  value={form.twitterHandle}
                  onChange={(e) => handleChange("twitterHandle", e.target.value)}
                  placeholder="username"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>GitHub</label>
                <input
                  type="text"
                  value={form.githubHandle}
                  onChange={(e) => handleChange("githubHandle", e.target.value)}
                  placeholder="username"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>LinkedIn</label>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Edit mode
  if (mode === "edit" && profile) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <StatusBadge status={profile.approvalStatus} />
        </header>

        {error && <p className={styles.error}>{error}</p>}

        {isApproved && (
          <p className={styles.warning}>
            You can update your bio and links freely. Changing your name, handle, or photo will require re-approval.
          </p>
        )}

        <div className={styles.card}>
          <div className={styles.portraitSection}>
            <Portrait src={profile.portraitUrl} alt={profile.name} size="xl" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <button
              type="button"
              className={styles.changeButton}
              onClick={handleChangePhotoClick}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Change photo"}
            </button>
          </div>

          <form className={styles.form} onSubmit={handleUpdate}>
            <div className={styles.field}>
              <label className={styles.label}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Handle *</label>
              <div className={styles.handleInput}>
                <span className={styles.handlePrefix}>@</span>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => handleChange("handle", e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Corktown"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
                className={styles.textarea}
              />
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Website</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => handleChange("websiteUrl", e.target.value)}
                  placeholder="https://"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Twitter</label>
                <input
                  type="text"
                  value={form.twitterHandle}
                  onChange={(e) => handleChange("twitterHandle", e.target.value)}
                  placeholder="username"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>GitHub</label>
                <input
                  type="text"
                  value={form.githubHandle}
                  onChange={(e) => handleChange("githubHandle", e.target.value)}
                  placeholder="username"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>LinkedIn</label>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setForm(profileToForm(profile));
                  setMode("view");
                }}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // View mode
  if (!profile) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>No profile yet</h2>
        <p className={styles.emptyText}>
          Create your profile to appear in the directory.
        </p>
        <button className={styles.createButton} onClick={() => setMode("create")}>
          Create profile
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <StatusBadge status={profile.approvalStatus} />
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <StatusMessage status={profile.approvalStatus} />

      <div className={styles.card}>
        <div className={styles.portraitSection}>
          <Portrait src={profile.portraitUrl} alt={profile.name} size="xl" />
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <button
                type="button"
                className={styles.changeButton}
                onClick={handleChangePhotoClick}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Change photo"}
              </button>
            </>
          )}
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Name</span>
            <span className={styles.detailValue}>{profile.name}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Handle</span>
            <span className={styles.detailValue}>@{profile.handle}</span>
          </div>

          {profile.location && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>{profile.location}</span>
            </div>
          )}

          {profile.bio && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Bio</span>
              <span className={styles.detailValue}>{profile.bio}</span>
            </div>
          )}

          {profile.websiteUrl && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Website</span>
              <span className={styles.detailValue}>{profile.websiteUrl}</span>
            </div>
          )}

          {profile.twitterHandle && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Twitter</span>
              <span className={styles.detailValue}>@{profile.twitterHandle}</span>
            </div>
          )}

          {profile.githubHandle && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>GitHub</span>
              <span className={styles.detailValue}>{profile.githubHandle}</span>
            </div>
          )}

          {profile.linkedinUrl && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>LinkedIn</span>
              <span className={styles.detailValue}>{profile.linkedinUrl}</span>
            </div>
          )}
        </div>

        <div className={styles.viewActions}>
          {canEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={() => setMode("edit")}
            >
              Edit profile
            </button>
          )}
          {canSubmit && (
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
