import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts";

/**
 * RequireApproved
 * Gate for member-only areas (the directory). Until a member's profile has been
 * approved, the only place they can go is the profile/onboarding flow at
 * /account. Admins always have access. Approval is a single admin action that
 * flips the account to approved — see POST /admin/profiles/:id/approve.
 */
export function RequireApproved() {
  const { user } = useAuth();

  if (user?.isAdmin || user?.status === "approved") {
    return <Outlet />;
  }

  return <Navigate to="/account" replace />;
}
