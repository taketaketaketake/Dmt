// =============================================================================
// TYPES
// Matches backend Prisma schema
// =============================================================================

export type UserStatus = "pending" | "approved" | "suspended";
export type ProfileApprovalStatus = "draft" | "pending_review" | "approved" | "rejected";
export type ProjectStatus = "active" | "completed" | "archived";
export type JobType = "full_time" | "part_time" | "contract" | "freelance";

export interface User {
  id: string;
  email: string;
  status: UserStatus;
  isEmployer: boolean;
  isAdmin: boolean;
}

export interface Profile {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
  approvalStatus: ProfileApprovalStatus;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  websiteUrl?: string;
  repoUrl?: string;
  createdAt: string;
  creator: Pick<Profile, "id" | "name" | "handle" | "portraitUrl">;
}

export interface Job {
  id: string;
  title: string;
  companyName: string;
  description?: string;
  type: JobType;
  applyUrl: string;
  expiresAt: string;
  createdAt: string;
  poster: Pick<Profile, "id" | "name" | "handle" | "portraitUrl">;
}

// View models for lists
export interface ProfileListItem {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  creator: Pick<Profile, "id" | "name" | "handle" | "portraitUrl">;
}

export interface JobListItem {
  id: string;
  title: string;
  companyName: string;
  type: JobType;
  expiresAt: string;
  poster: Pick<Profile, "id" | "name" | "handle">;
}

// =============================================================================
// PROJECT NEEDS TYPES
// =============================================================================

export interface NeedOption {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface NeedCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  options: NeedOption[];
}

export interface ProjectNeed {
  categoryId: string;
  category: Pick<NeedCategory, "id" | "name" | "slug">;
  optionIds: string[];
  options: Pick<NeedOption, "id" | "name" | "slug">[];
  contextText?: string;
  updatedAt: string;
}

export interface NeedInput {
  categoryId: string;
  optionIds: string[];
  contextText?: string;
}
