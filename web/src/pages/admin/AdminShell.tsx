import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts";
import styles from "./AdminShell.module.css";

export function AdminShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // Redirect non-admins
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Admin</h1>
          <nav className={styles.nav}>
            <NavLink
              to="/admin/queue"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Approval Queue
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Users
            </NavLink>
          </nav>
          <NavLink to="/" className={styles.exitLink}>
            Exit Admin
          </NavLink>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
