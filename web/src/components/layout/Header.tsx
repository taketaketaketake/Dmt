import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts";
import { useBranding } from "../../hooks/useBranding";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuth();
  const branding = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

  // The directory is members-only until a profile is approved. Hide its links
  // for users still in the onboarding/pending flow to match the route guard.
  const canBrowse = user?.isAdmin || user?.status === "approved";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={closeMenu}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.name}
              className={styles.logoImage}
            />
          ) : (
            branding.name
          )}
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
          {canBrowse && (
            <>
              <NavLink to="/people" className={navLinkClass} onClick={closeMenu}>
                People
              </NavLink>
              <NavLink to="/projects" className={navLinkClass} onClick={closeMenu}>
                Projects
              </NavLink>
              <NavLink to="/jobs" className={navLinkClass} onClick={closeMenu}>
                Jobs
              </NavLink>
              <NavLink to="/courses" className={navLinkClass} onClick={closeMenu}>
                Courses
              </NavLink>
              <span className={styles.divider} />
            </>
          )}
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
