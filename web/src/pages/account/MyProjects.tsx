import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui";
import { useAuth } from "../../contexts";
import { projects as projectsApi } from "../../lib/api";
import type { Project, ProjectStatus } from "../../data/types";
import styles from "./MyProjects.module.css";

type ProjectFormData = {
  title: string;
  description: string;
  status: ProjectStatus;
  websiteUrl: string;
  repoUrl: string;
};

const emptyForm: ProjectFormData = {
  title: "",
  description: "",
  status: "active",
  websiteUrl: "",
  repoUrl: "",
};

function projectToForm(project: Project): ProjectFormData {
  return {
    title: project.title,
    description: project.description || "",
    status: project.status,
    websiteUrl: project.websiteUrl || "",
    repoUrl: project.repoUrl || "",
  };
}

export function MyProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canCreateProjects = profile?.approvalStatus === "approved";

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsApi.mine();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    }
  }, []);

  useEffect(() => {
    loadProjects().then(() => setIsLoading(false));
  }, [loadProjects]);

  const handleChange = useCallback((field: keyof ProjectFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { project } = await projectsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        websiteUrl: form.websiteUrl.trim() || undefined,
        repoUrl: form.repoUrl.trim() || undefined,
      });
      setProjects((prev) => [project, ...prev]);
      setForm(emptyForm);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  const handleUpdate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { project } = await projectsApi.update(editingProject.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        websiteUrl: form.websiteUrl.trim() || undefined,
        repoUrl: form.repoUrl.trim() || undefined,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? project : p))
      );
      setEditingProject(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProject, form]);

  const handleDelete = useCallback(async (id: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const startEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setForm(projectToForm(project));
    setIsCreating(false);
    setError(null);
  }, []);

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setEditingProject(null);
    setForm(emptyForm);
    setError(null);
  }, []);

  const cancelForm = useCallback(() => {
    setIsCreating(false);
    setEditingProject(null);
    setForm(emptyForm);
    setError(null);
  }, []);

  if (isLoading) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>My Projects</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  // Show form when creating or editing
  if (isCreating || editingProject) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {editingProject ? "Edit Project" : "New Project"}
          </h1>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formCard}>
          <form className={styles.form} onSubmit={editingProject ? handleUpdate : handleCreate}>
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Project name"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                placeholder="What is this project about?"
                className={styles.textarea}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className={styles.select}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
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
                <label className={styles.label}>Repository</label>
                <input
                  type="url"
                  value={form.repoUrl}
                  onChange={(e) => handleChange("repoUrl", e.target.value)}
                  placeholder="https://github.com/..."
                  className={styles.input}
                />
              </div>
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
                  : editingProject
                  ? "Save changes"
                  : "Create project"}
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
        <h1 className={styles.title}>My Projects</h1>
        {canCreateProjects && (
          <button className={styles.newButton} onClick={startCreate}>
            New project
          </button>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {!canCreateProjects && (
        <p className={styles.notice}>
          Your profile must be approved before you can create projects.
        </p>
      )}

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            You haven't created any projects yet.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {projects.map((project) => (
            <div key={project.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.projectTitle}>{project.title}</h2>
                <Badge variant="muted">{project.status}</Badge>
              </div>
              {project.description && (
                <p className={styles.description}>{project.description}</p>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.editButton}
                  onClick={() => startEdit(project)}
                >
                  Edit
                </button>
                <Link
                  to={`/projects/${project.id}`}
                  className={styles.viewLink}
                >
                  View
                </Link>
                {deleteConfirm === project.id ? (
                  <>
                    <button
                      className={styles.deleteConfirm}
                      onClick={() => handleDelete(project.id)}
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
                    onClick={() => setDeleteConfirm(project.id)}
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
