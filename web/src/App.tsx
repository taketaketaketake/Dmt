import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts";
import { Shell } from "./components/layout";
import {
  LoginPage,
  PeoplePage,
  PersonDetailPage,
  ProjectsPage,
  ProjectDetailPage,
  JobsPage,
  JobDetailPage,
  AccountPage,
  NotFoundPage,
} from "./pages";
import {
  ProfilePage,
  MyProjectsPage,
  MyJobsPage,
  FavoritesPage,
  FollowingPage,
  BillingPage,
} from "./pages/account/index";
import {
  AdminShell,
  ApprovalQueuePage,
  ProfileReviewPage,
  UsersPage,
  UserDetailPage,
} from "./pages/admin/index";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--color-ink)",
        color: "var(--color-text-secondary)",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated routes */}
        <Route element={<Shell isAuthenticated={isAuthenticated} />}>
          {/* Directory */}
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:handle" element={<PersonDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />

          {/* Account */}
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
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/people" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
