import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts";
import styles from "./Account.module.css";

export function AccountPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="container">
      <div className={styles.layout}>
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink
              to="/account"
              end
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Profile
            </NavLink>
            <NavLink
              to="/account/projects"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              My Projects
            </NavLink>
            <NavLink
              to="/account/jobs"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              My Jobs
            </NavLink>

            <div className={styles.navDivider} />

            <NavLink
              to="/account/favorites"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Favorites
            </NavLink>
            <NavLink
              to="/account/following"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Following
            </NavLink>

            <div className={styles.navDivider} />

            <NavLink
              to="/account/billing"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Billing
            </NavLink>
          </nav>

          <button className={styles.signOutButton} onClick={handleSignOut}>
            Sign out
          </button>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
