// =============================================================================
// API CLIENT
// Minimal fetch wrapper for backend communication
// =============================================================================

import type {
  User,
  Profile,
  ProfileListItem,
  Project,
  ProjectListItem,
  Job,
  JobListItem,
} from "../data/types";

// Base URL - in dev, proxy handles this; in prod, same origin
const API_BASE = "";

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class ApiError extends Error {
  status: number;
  statusText: string;
  body?: { error?: string };

  constructor(status: number, statusText: string, body?: { error?: string }) {
    super(body?.error || statusText);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// =============================================================================
// FETCH WRAPPER
// =============================================================================

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let body: { error?: string } | undefined;
    try {
      body = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

// =============================================================================
// AUTH API
// =============================================================================

export interface AuthMeResponse {
  user: User;
  profile: Pick<
    Profile,
    "id" | "name" | "handle" | "bio" | "location" | "portraitUrl" | "approvalStatus"
  > | null;
}

export const auth = {
  login: (email: string) =>
    request<{ message: string; token?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  me: () => request<AuthMeResponse>("/auth/me"),
};

// =============================================================================
// PROFILES API
// =============================================================================

export interface ProfileCreateData {
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
}

export interface ProfileUpdateData {
  name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
}

export const profiles = {
  list: () =>
    request<{ profiles: ProfileListItem[] }>("/api/profiles"),

  get: (handle: string) =>
    request<{ profile: Profile }>(`/api/profiles/${handle}`),

  me: () =>
    request<{ profile: Profile }>("/api/profiles/me"),

  create: (data: ProfileCreateData) =>
    request<{ profile: Profile }>("/api/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (data: ProfileUpdateData) =>
    request<{ profile: Profile }>("/api/profiles/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  submit: () =>
    request<{ profile: Profile; message: string }>("/api/profiles/me/submit", {
      method: "POST",
    }),
};

// =============================================================================
// PROJECTS API
// =============================================================================

export interface ProjectDetail extends Project {
  creator: {
    id: string;
    userId: string;
    name: string;
    handle: string;
    portraitUrl?: string;
    approvalStatus: string;
  };
}

export const projects = {
  list: () =>
    request<{ projects: ProjectListItem[] }>("/api/projects"),

  get: (id: string) =>
    request<{ project: ProjectDetail }>(`/api/projects/${id}`),

  mine: () =>
    request<{ projects: Project[] }>("/api/projects/mine"),

  create: (data: { title: string; description?: string; status?: string; websiteUrl?: string; repoUrl?: string }) =>
    request<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; description?: string; status?: string; websiteUrl?: string; repoUrl?: string }) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/projects/${id}`, {
      method: "DELETE",
    }),
};

// =============================================================================
// JOBS API
// =============================================================================

export interface JobDetail extends Job {
  poster: {
    id: string;
    name: string;
    handle: string;
    portraitUrl?: string;
    bio?: string;
    approvalStatus: string;
  };
}

export const jobs = {
  list: () =>
    request<{ jobs: JobListItem[] }>("/api/jobs"),

  get: (id: string) =>
    request<{ job: JobDetail }>(`/api/jobs/${id}`),

  mine: () =>
    request<{ jobs: Job[] }>("/api/jobs/mine"),

  create: (data: { title: string; companyName: string; description?: string; type: string; applyUrl: string; expiresAt?: string }) =>
    request<{ job: Job }>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; companyName?: string; description?: string; type?: string; applyUrl?: string; active?: boolean; expiresAt?: string }) =>
    request<{ job: Job }>(`/api/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/jobs/${id}`, {
      method: "DELETE",
    }),
};

// =============================================================================
// FAVORITES API
// =============================================================================

export interface FavoriteItem {
  id: string;
  createdAt: string;
  profile: ProfileListItem;
}

export const favorites = {
  list: () =>
    request<{ favorites: FavoriteItem[] }>("/api/favorites"),

  add: (profileId: string) =>
    request<{ favorite: { id: string } }>(`/api/favorites/${profileId}`, {
      method: "POST",
    }),

  remove: (profileId: string) =>
    request<{ message: string }>(`/api/favorites/${profileId}`, {
      method: "DELETE",
    }),

  check: (profileId: string) =>
    request<{ favorited: boolean }>(`/api/favorites/check/${profileId}`),
};

// =============================================================================
// FOLLOWS API
// =============================================================================

export interface FollowItem {
  id: string;
  createdAt: string;
  project: {
    id: string;
    title: string;
    description?: string;
    status: string;
    websiteUrl?: string;
    creator: {
      id: string;
      name: string;
      handle: string;
      portraitUrl?: string;
    };
  };
}

export const follows = {
  list: () =>
    request<{ follows: FollowItem[] }>("/api/follows"),

  add: (projectId: string) =>
    request<{ follow: { id: string } }>(`/api/follows/${projectId}`, {
      method: "POST",
    }),

  remove: (projectId: string) =>
    request<{ message: string }>(`/api/follows/${projectId}`, {
      method: "DELETE",
    }),

  check: (projectId: string) =>
    request<{ following: boolean }>(`/api/follows/check/${projectId}`),
};

// =============================================================================
// BILLING API
// =============================================================================

export const billing = {
  status: () =>
    request<{ isEmployer: boolean; hasStripeAccount: boolean }>("/billing/status"),

  checkout: () =>
    request<{ url: string }>("/billing/checkout", {
      method: "POST",
    }),

  portal: () =>
    request<{ url: string }>("/billing/portal", {
      method: "POST",
    }),
};

// =============================================================================
// ADMIN API
// =============================================================================

export interface AdminProfile {
  id: string;
  userId: string;
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
  approvalStatus: string;
  approvedAt?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    status?: string;
    createdAt: string;
    lastLoginAt?: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  status: string;
  isEmployer: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
  profile?: {
    id: string;
    name: string;
    handle: string;
    approvalStatus: string;
  };
}

export interface AdminUserDetail extends AdminUser {
  profile?: {
    id: string;
    name: string;
    handle: string;
    bio?: string;
    location?: string;
    portraitUrl?: string;
    approvalStatus: string;
    projectsCreated: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
    }>;
    jobsPosted: Array<{
      id: string;
      title: string;
      companyName: string;
      active: boolean;
      createdAt: string;
    }>;
  };
}

export const admin = {
  // Approval queue
  pendingProfiles: () =>
    request<{ profiles: AdminProfile[] }>("/admin/profiles/pending"),

  getProfile: (id: string) =>
    request<{ profile: AdminProfile }>(`/admin/profiles/${id}`),

  approveProfile: (id: string) =>
    request<{ profile: AdminProfile; message: string }>(`/admin/profiles/${id}/approve`, {
      method: "POST",
    }),

  rejectProfile: (id: string, note?: string) =>
    request<{ profile: AdminProfile; message: string }>(`/admin/profiles/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  // User management
  listUsers: () =>
    request<{ users: AdminUser[] }>("/admin/users"),

  getUser: (id: string) =>
    request<{ user: AdminUserDetail }>(`/admin/users/${id}`),

  suspendUser: (id: string) =>
    request<{ user: AdminUser; message: string }>(`/admin/users/${id}/suspend`, {
      method: "POST",
    }),

  reinstateUser: (id: string) =>
    request<{ user: AdminUser; message: string }>(`/admin/users/${id}/reinstate`, {
      method: "POST",
    }),

  // Content moderation
  removeProject: (id: string) =>
    request<{ message: string }>(`/admin/projects/${id}`, {
      method: "DELETE",
    }),

  removeJob: (id: string) =>
    request<{ message: string }>(`/admin/jobs/${id}`, {
      method: "DELETE",
    }),
};

// =============================================================================
// UPLOADS API
// =============================================================================

export const uploads = {
  image: async (file: File, type: "portrait" | "project" = "portrait") => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/uploads/image?type=${type}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      let body: { error?: string } | undefined;
      try {
        body = await response.json();
      } catch {
        // Ignore JSON parse errors
      }
      throw new ApiError(response.status, response.statusText, body);
    }

    return response.json() as Promise<{ url: string; filename: string }>;
  },
};
