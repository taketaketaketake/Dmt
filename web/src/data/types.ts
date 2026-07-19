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

// A skill a person offers, drawn from the shared needs taxonomy
export interface SkillTag {
  id: string; // NeedOption id
  name: string;
  slug: string;
  categorySlug: string;
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
  skills?: SkillTag[];
}

// A project's industry category tag
export interface CategoryTag {
  id: string;
  name: string;
  slug: string;
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
  categories?: CategoryTag[];
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
  skills?: SkillTag[];
}

export interface ProjectListItem {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  creator: Pick<Profile, "id" | "name" | "handle" | "portraitUrl">;
  categories?: CategoryTag[];
  needs?: SkillTag[];
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
  offerable?: boolean;
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

// =============================================================================
// COURSES (ADR-010)
// =============================================================================

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  lessonCount: number;
  completedCount: number;
}

export interface CourseLessonSummary {
  id: string;
  title: string;
  position: number;
  slideCount: number;
  completed: boolean;
  lastSlide: number;
}

export interface CourseModuleOutline {
  id: string;
  title: string;
  position: number;
  lessons: CourseLessonSummary[];
}

export interface CourseOutline {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  resumeLessonId: string | null;
  modules: CourseModuleOutline[];
}

export interface LessonNeighbor {
  id: string;
  title: string;
}

export interface LessonContent {
  id: string;
  title: string;
  body?: string | null;
  slideUrls: string[];
  videoId?: string | null;
  moduleTitle: string;
  prev: LessonNeighbor | null;
  next: LessonNeighbor | null;
  lastSlide: number;
  completed: boolean;
}

export interface LessonProgressResult {
  lessonId: string;
  lastSlide: number;
  completedAt: string | null;
}
