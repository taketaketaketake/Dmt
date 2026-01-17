import styles from "./Badge.module.css";

interface BadgeProps {
  children: string;
  variant?: "default" | "muted";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}
