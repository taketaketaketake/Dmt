// =============================================================================
// QUERY HOOKS
// Typed TanStack Query wrappers around the API client. Centralizing the query
// keys here keeps cache invalidation consistent across pages.
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  profiles as profilesApi,
  projects as projectsApi,
  jobs as jobsApi,
  needs as needsApi,
  categories as categoriesApi,
  favorites as favoritesApi,
  follows as followsApi,
  billing as billingApi,
  admin as adminApi,
  courses as coursesApi,
  quizzes as quizzesApi,
} from "../lib/api";

// Taxonomy and category lists are effectively static reference data; keep them
// fresh for the whole session rather than refetching per page.
const STATIC_STALE_TIME = 60 * 60_000;

// -----------------------------------------------------------------------------
// QUERY KEYS
// -----------------------------------------------------------------------------

export const queryKeys = {
  profiles: {
    list: ["profiles", "list"] as const,
    detail: (handle: string) => ["profiles", "detail", handle] as const,
    me: ["profiles", "me"] as const,
    skills: ["profiles", "me", "skills"] as const,
    matchingProjects: (handle: string) =>
      ["profiles", "matching-projects", handle] as const,
  },
  projects: {
    list: ["projects", "list"] as const,
    byCreator: (handle: string) => ["projects", "by-creator", handle] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    mine: ["projects", "mine"] as const,
    needs: (id: string) => ["projects", id, "needs"] as const,
    matches: (id: string) => ["projects", id, "matches"] as const,
  },
  jobs: {
    list: ["jobs", "list"] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
    mine: ["jobs", "mine"] as const,
  },
  needs: {
    taxonomy: (offerable?: boolean) => ["needs", "taxonomy", { offerable: !!offerable }] as const,
  },
  categories: {
    list: (type: string) => ["categories", type] as const,
  },
  favorites: {
    list: ["favorites", "list"] as const,
    status: (profileId: string) => ["favorites", "status", profileId] as const,
  },
  follows: {
    list: ["follows", "list"] as const,
    status: (projectId: string) => ["follows", "status", projectId] as const,
  },
  billing: {
    status: ["billing", "status"] as const,
  },
  courses: {
    publicList: ["courses", "public"] as const,
    list: ["courses", "list"] as const,
    detail: (slug: string) => ["courses", "detail", slug] as const,
    lesson: (slug: string, lessonId: string) =>
      ["courses", "lesson", slug, lessonId] as const,
    quiz: (slug: string, moduleId: string) =>
      ["courses", "quiz", slug, moduleId] as const,
  },
  admin: {
    pendingProfiles: ["admin", "profiles", "pending"] as const,
    profile: (id: string) => ["admin", "profiles", id] as const,
    pendingJobs: ["admin", "jobs", "pending"] as const,
    users: ["admin", "users"] as const,
    user: (id: string) => ["admin", "users", id] as const,
    stats: ["admin", "stats"] as const,
  },
} as const;

// -----------------------------------------------------------------------------
// PROFILES
// -----------------------------------------------------------------------------

export function useProfilesList() {
  return useQuery({
    queryKey: queryKeys.profiles.list,
    queryFn: () => profilesApi.list().then((d) => d.profiles),
  });
}

export function useProfile(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(handle ?? ""),
    queryFn: () => profilesApi.get(handle!).then((d) => d.profile),
    enabled: !!handle,
  });
}

export function useMyProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profiles.me,
    queryFn: () => profilesApi.me().then((d) => d.profile),
    enabled: options?.enabled ?? true,
  });
}

export function useMySkills() {
  return useQuery({
    queryKey: queryKeys.profiles.skills,
    queryFn: () => profilesApi.skills().then((d) => d.skills),
  });
}

export function useMatchingProjects(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.matchingProjects(handle ?? ""),
    queryFn: () => profilesApi.matchingProjects(handle!).then((d) => d.projects),
    enabled: !!handle,
  });
}

// -----------------------------------------------------------------------------
// PROJECTS
// -----------------------------------------------------------------------------

export function useProjectsList() {
  return useQuery({
    queryKey: queryKeys.projects.list,
    queryFn: () => projectsApi.list().then((d) => d.projects),
  });
}

export function useProjectsByCreator(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.byCreator(handle ?? ""),
    queryFn: () => projectsApi.byCreator(handle!).then((d) => d.projects),
    enabled: !!handle,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => projectsApi.get(id!).then((d) => d.project),
    enabled: !!id,
  });
}

export function useMyProjects() {
  return useQuery({
    queryKey: queryKeys.projects.mine,
    queryFn: () => projectsApi.mine().then((d) => d.projects),
  });
}

export function useProjectNeeds(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.needs(id ?? ""),
    queryFn: () => projectsApi.getNeeds(id!).then((d) => d.needs),
    enabled: !!id,
  });
}

export function useProjectMatches(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.matches(id ?? ""),
    queryFn: () => projectsApi.matches(id!).then((d) => d.people),
    enabled: !!id,
  });
}

// -----------------------------------------------------------------------------
// JOBS
// -----------------------------------------------------------------------------

export function useJobsList() {
  return useQuery({
    queryKey: queryKeys.jobs.list,
    queryFn: () => jobsApi.list().then((d) => d.jobs),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id ?? ""),
    queryFn: () => jobsApi.get(id!).then((d) => d.job),
    enabled: !!id,
  });
}

export function useMyJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.mine,
    queryFn: () => jobsApi.mine().then((d) => d.jobs),
  });
}

// -----------------------------------------------------------------------------
// TAXONOMY / CATEGORIES (static reference data)
// -----------------------------------------------------------------------------

export function useNeedsTaxonomy(opts?: { offerable?: boolean }) {
  return useQuery({
    queryKey: queryKeys.needs.taxonomy(opts?.offerable),
    queryFn: () => needsApi.taxonomy(opts).then((d) => d.categories),
    staleTime: STATIC_STALE_TIME,
  });
}

export function useCategories(type: "industry" | "project_type" | "skill" = "industry") {
  return useQuery({
    queryKey: queryKeys.categories.list(type),
    queryFn: () => categoriesApi.list(type).then((d) => d.categories),
    staleTime: STATIC_STALE_TIME,
  });
}

// -----------------------------------------------------------------------------
// FAVORITES
// -----------------------------------------------------------------------------

export function useFavoritesList() {
  return useQuery({
    queryKey: queryKeys.favorites.list,
    queryFn: () => favoritesApi.list().then((d) => d.favorites),
  });
}

export function useFavoriteStatus(profileId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.favorites.status(profileId ?? ""),
    queryFn: () => favoritesApi.check(profileId!).then((d) => d.favorited),
    enabled: (options?.enabled ?? true) && !!profileId,
  });
}

// Add/remove a favorite with an optimistic flip of the cached status, rolling
// back if the request fails. Also invalidates the favorites list.
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, favorited }: { profileId: string; favorited: boolean }) => {
      if (favorited) await favoritesApi.remove(profileId);
      else await favoritesApi.add(profileId);
    },
    onMutate: async ({ profileId, favorited }) => {
      const key = queryKeys.favorites.status(profileId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<boolean>(key);
      qc.setQueryData<boolean>(key, !favorited);
      return { key, previous };
    },
    onError: (_err, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.status(vars.profileId) });
      qc.invalidateQueries({ queryKey: queryKeys.favorites.list });
    },
  });
}

// Remove a favorite from the Favorites list page.
export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => favoritesApi.remove(profileId),
    onSuccess: (_data, profileId) => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.list });
      qc.invalidateQueries({ queryKey: queryKeys.favorites.status(profileId) });
    },
  });
}

// -----------------------------------------------------------------------------
// FOLLOWS
// -----------------------------------------------------------------------------

export function useFollowsList() {
  return useQuery({
    queryKey: queryKeys.follows.list,
    queryFn: () => followsApi.list().then((d) => d.follows),
  });
}

export function useFollowStatus(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.follows.status(projectId ?? ""),
    queryFn: () => followsApi.check(projectId!).then((d) => d.following),
    enabled: (options?.enabled ?? true) && !!projectId,
    // The follow check can 403 for not-yet-approved users; don't retry on that.
    retry: false,
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, following }: { projectId: string; following: boolean }) => {
      if (following) await followsApi.remove(projectId);
      else await followsApi.add(projectId);
    },
    onMutate: async ({ projectId, following }) => {
      const key = queryKeys.follows.status(projectId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<boolean>(key);
      qc.setQueryData<boolean>(key, !following);
      return { key, previous };
    },
    onError: (_err, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.follows.status(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.follows.list });
    },
  });
}

export function useRemoveFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => followsApi.remove(projectId),
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: queryKeys.follows.list });
      qc.invalidateQueries({ queryKey: queryKeys.follows.status(projectId) });
    },
  });
}

// -----------------------------------------------------------------------------
// BILLING
// -----------------------------------------------------------------------------

export function useBillingStatus() {
  return useQuery({
    queryKey: queryKeys.billing.status,
    queryFn: () => billingApi.status(),
  });
}

// -----------------------------------------------------------------------------
// ADMIN
// -----------------------------------------------------------------------------

export function usePendingProfiles() {
  return useQuery({
    queryKey: queryKeys.admin.pendingProfiles,
    queryFn: () => adminApi.pendingProfiles().then((d) => d.profiles),
  });
}

export function useAdminProfile(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.profile(id ?? ""),
    queryFn: () => adminApi.getProfile(id!).then((d) => d.profile),
    enabled: !!id,
  });
}

export function usePendingJobs() {
  return useQuery({
    queryKey: queryKeys.admin.pendingJobs,
    queryFn: () => adminApi.pendingJobs().then((d) => d.jobs),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => adminApi.listUsers().then((d) => d.users),
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.user(id ?? ""),
    queryFn: () => adminApi.getUser(id!).then((d) => d.user),
    enabled: !!id,
  });
}

export function useAdminStats(options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof adminApi.stats>>>>) {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => adminApi.stats(),
    ...options,
  });
}

// -----------------------------------------------------------------------------
// COURSES (ADR-010)
// -----------------------------------------------------------------------------

// Unauthenticated curriculum preview for the public landing page
export function usePublicCourses() {
  return useQuery({
    queryKey: queryKeys.courses.publicList,
    queryFn: () => coursesApi.publicList().then((d) => d.courses),
  });
}

export function useCoursesList() {
  return useQuery({
    queryKey: queryKeys.courses.list,
    queryFn: () => coursesApi.list().then((d) => d.courses),
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(slug),
    queryFn: () => coursesApi.get(slug).then((d) => d.course),
    enabled: !!slug,
  });
}

export function useLesson(slug: string, lessonId: string) {
  return useQuery({
    queryKey: queryKeys.courses.lesson(slug, lessonId),
    queryFn: () => coursesApi.lesson(slug, lessonId).then((d) => d.lesson),
    enabled: !!slug && !!lessonId,
  });
}

// Saves resume position / completion. Invalidates the course outline and list
// (progress counts) but NOT the lesson query — the player owns its local slide
// state while mounted, and refetching mid-lesson would fight the user.
export function useUpdateLessonProgress(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      ...data
    }: {
      lessonId: string;
      lastSlide?: number;
      completed?: boolean;
    }) => coursesApi.updateProgress(lessonId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list });
    },
  });
}

export function useModuleQuiz(slug: string, moduleId: string) {
  return useQuery({
    queryKey: queryKeys.courses.quiz(slug, moduleId),
    queryFn: () => quizzesApi.get(slug, moduleId).then((d) => d.quiz),
    enabled: !!slug && !!moduleId,
  });
}

// Grading happens server-side; refetch the quiz (answer key may now be
// revealed) and the outline (status badge) after every submission.
export function useSubmitQuizAttempt(slug: string, moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: number[]) => quizzesApi.submit(slug, moduleId, answers),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.quiz(slug, moduleId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(slug) });
    },
  });
}
