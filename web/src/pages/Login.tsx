import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts";
import styles from "./Login.module.css";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/people" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email);

    setIsLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.message || "Failed to send login link");
    }
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.description}>
            We sent a sign-in link to <strong>{email}</strong>
          </p>
          <p className={styles.hint}>
            The link expires in 15 minutes.
          </p>
          <button
            type="button"
            className={styles.textAction}
            onClick={() => {
              setSubmitted(false);
              setError(null);
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Detroit Directory</h1>
          <p className={styles.tagline}>
            A curated archive of builders in Detroit
          </p>
        </header>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Sign in</h2>
          <p className={styles.cardDescription}>
            Enter your email to receive a sign-in link.
            New members are reviewed before approval.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              <span className={styles.labelText}>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className={styles.input}
              />
            </label>

            {error && (
              <p className={styles.error}>{error}</p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Continue with email"}
            </button>
          </form>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            This is a members-only directory.
            <br />
            Profile approval is manual and takes 1-2 days.
          </p>
        </footer>
      </div>
    </div>
  );
}
