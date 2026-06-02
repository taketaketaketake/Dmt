import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Detroit Directory
        </Link>

        <nav className={styles.nav}>
          <NavLink
            to="/people"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            People
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Projects
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Jobs
          </NavLink>
          <span className={styles.divider} />
          <NavLink
            to="/account"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Account
          </NavLink>
          {user?.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              Admin
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
