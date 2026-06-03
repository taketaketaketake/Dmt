import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={closeMenu}>
          Detroit Directory
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`${styles.menuIcon} ${menuOpen ? styles.menuIconOpen : ""}`}
          />
        </button>

        <nav
          id="primary-nav"
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}
        >
          <NavLink to="/people" className={navLinkClass} onClick={closeMenu}>
            People
          </NavLink>
          <NavLink to="/projects" className={navLinkClass} onClick={closeMenu}>
            Projects
          </NavLink>
          <NavLink to="/jobs" className={navLinkClass} onClick={closeMenu}>
            Jobs
          </NavLink>
          <span className={styles.divider} />
          <NavLink to="/account" className={navLinkClass} onClick={closeMenu}>
            Account
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" className={navLinkClass} onClick={closeMenu}>
              Admin
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
