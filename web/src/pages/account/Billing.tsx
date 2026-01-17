import { useState, useEffect, useCallback } from "react";
import { billing as billingApi } from "../../lib/api";
import styles from "./Billing.module.css";

export function BillingPage() {
  const [isEmployer, setIsEmployer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    billingApi
      .status()
      .then((data) => {
        setIsEmployer(data.isEmployer);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load billing status");
        setIsLoading(false);
      });
  }, []);

  const handleCheckout = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const data = await billingApi.checkout();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsSubmitting(false);
    }
  }, []);

  const handlePortal = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const data = await billingApi.portal();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open portal");
      setIsSubmitting(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Billing</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Billing</h1>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.status}>
          <span className={styles.statusLabel}>Employer status</span>
          <span className={styles.statusValue}>
            {isEmployer ? "Active" : "Inactive"}
          </span>
        </div>

        {isEmployer ? (
          <div className={styles.section}>
            <p className={styles.text}>
              Your employer subscription is active. You can post jobs to the directory.
            </p>
            <button
              className={styles.portalButton}
              onClick={handlePortal}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Loading..." : "Manage subscription"}
            </button>
          </div>
        ) : (
          <div className={styles.section}>
            <p className={styles.text}>
              Become an employer to post job listings to the directory.
            </p>
            <button
              className={styles.subscribeButton}
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Loading..." : "Subscribe as employer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
