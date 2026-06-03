import { useCallback, useEffect } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts";
import { useAdminStats, queryKeys } from "../../hooks/queries";
import type { AdminOutletContext } from "./adminOutlet";
import styles from "./AdminShell.module.css";

interface AdminTab {
  to: string;
  label: string;
  count?: number;
}

export function AdminShell() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isAdmin = user?.isAdmin ?? false;
  // Badge counts are non-critical, so failures are ignored silently.
  const { data: stats } = useAdminStats({ enabled: isAdmin, retry: false });

  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
  }, [queryClient]);

  // Refresh counts whenever the active admin route changes (e.g. after
  // approving a profile in the detail view and navigating back).
  useEffect(() => {
    if (isAdmin) {
      refreshStats();
    }
  }, [isAdmin, location.pathname, refreshStats]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // Redirect non-admins
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const tabs: AdminTab[] = [
    { to: "/admin/queue", label: "Pending Users", count: stats?.pendingProfiles },
    { to: "/admin/jobs", label: "Pending Jobs", count: stats?.pendingJobs },
    { to: "/admin/users", label: "Users" },
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Admin</h1>
          <nav className={styles.tabs}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
                }
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={styles.badge}>{tab.count}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/" className={styles.exitLink}>
            Exit Admin
          </NavLink>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet context={{ refreshStats } satisfies AdminOutletContext} />
      </main>
    </div>
  );
}
