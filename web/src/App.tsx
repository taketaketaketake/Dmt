import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "./contexts";
import { Shell, RequireApproved } from "./components/layout";

// Route-level code splitting: each page is its own chunk, loaded on demand so
// the initial bundle stays small (and the admin section isn't shipped to
// regular members). The barrel files export named components, so map each to a
// default export for React.lazy.
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const FounderSeriesPage = lazy(() => import("./pages/FounderSeries").then((m) => ({ default: m.FounderSeriesPage })));
const PeoplePage = lazy(() => import("./pages/People").then((m) => ({ default: m.PeoplePage })));
const PersonDetailPage = lazy(() => import("./pages/PersonDetail").then((m) => ({ default: m.PersonDetailPage })));
const ProjectsPage = lazy(() => import("./pages/Projects").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetail").then((m) => ({ default: m.ProjectDetailPage })));
const JobsPage = lazy(() => import("./pages/Jobs").then((m) => ({ default: m.JobsPage })));
const JobDetailPage = lazy(() => import("./pages/JobDetail").then((m) => ({ default: m.JobDetailPage })));
const CoursesPage = lazy(() => import("./pages/Courses").then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import("./pages/CourseDetail").then((m) => ({ default: m.CourseDetailPage })));
const LessonPage = lazy(() => import("./pages/Lesson").then((m) => ({ default: m.LessonPage })));
const AccountPage = lazy(() => import("./pages/Account").then((m) => ({ default: m.AccountPage })));
const NotFoundPage = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage })));

const ProfilePage = lazy(() => import("./pages/account/Profile").then((m) => ({ default: m.ProfilePage })));
const MyProjectsPage = lazy(() => import("./pages/account/MyProjects").then((m) => ({ default: m.MyProjectsPage })));
const MyJobsPage = lazy(() => import("./pages/account/MyJobs").then((m) => ({ default: m.MyJobsPage })));
const FavoritesPage = lazy(() => import("./pages/account/Favorites").then((m) => ({ default: m.FavoritesPage })));
const FollowingPage = lazy(() => import("./pages/account/Following").then((m) => ({ default: m.FollowingPage })));
const BillingPage = lazy(() => import("./pages/account/Billing").then((m) => ({ default: m.BillingPage })));

const AdminShell = lazy(() => import("./pages/admin/AdminShell").then((m) => ({ default: m.AdminShell })));
const ApprovalQueuePage = lazy(() => import("./pages/admin/ApprovalQueue").then((m) => ({ default: m.ApprovalQueuePage })));
const JobQueuePage = lazy(() => import("./pages/admin/JobQueue").then((m) => ({ default: m.JobQueuePage })));
const ProfileReviewPage = lazy(() => import("./pages/admin/ProfileReview").then((m) => ({ default: m.ProfileReviewPage })));
const UsersPage = lazy(() => import("./pages/admin/Users").then((m) => ({ default: m.UsersPage })));
const UserDetailPage = lazy(() => import("./pages/admin/UserDetail").then((m) => ({ default: m.UserDetailPage })));

const centeredLoader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  backgroundColor: "var(--color-ink)",
  color: "var(--color-text-secondary)",
} as const;

function FullPageLoader() {
  return <div style={centeredLoader}>Loading...</div>;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated routes */}
          <Route element={<Shell isAuthenticated={isAuthenticated} />}>
            {/* Directory — members only, gated until their profile is approved */}
            <Route element={<RequireApproved />}>
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/people/:handle" element={<PersonDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/courses/:slug/lessons/:lessonId" element={<LessonPage />} />
            </Route>

            {/* Account — reachable by any authenticated user, including those
                still building/awaiting approval on their profile */}
            <Route path="/account" element={<AccountPage />}>
              <Route index element={<ProfilePage />} />
              <Route path="projects" element={<MyProjectsPage />} />
              <Route path="jobs" element={<MyJobsPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="following" element={<FollowingPage />} />
              <Route path="billing" element={<BillingPage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="/admin/queue" replace />} />
            <Route path="queue" element={<ApprovalQueuePage />} />
            <Route path="queue/:id" element={<ProfileReviewPage />} />
            <Route path="jobs" element={<JobQueuePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
          </Route>

          {/* Homepage: members land on the directory; visitors get the
              public Founder Education Series landing page (the only public
              marketing route — there is no separate /founder-series URL) */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/people" replace /> : <FounderSeriesPage />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
