import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page Not Found");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "3rem", margin: 0, opacity: 0.3 }}>404</h1>
      <p style={{ fontSize: "1.125rem", margin: 0 }}>Page not found</p>
      <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/people"
        style={{
          marginTop: "0.5rem",
          color: "var(--color-accent)",
          textDecoration: "none",
        }}
      >
        Go to directory
      </Link>
    </div>
  );
}
