import styles from "./Portrait.module.css";

interface PortraitProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Portrait({ src, alt, size = "md", className }: PortraitProps) {
  const sizeClass = styles[size];

  if (!src) {
    return (
      <div
        className={`${styles.portrait} ${styles.placeholder} ${sizeClass} ${className || ""}`}
        aria-label={alt}
      >
        <span className={styles.initial}>{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${styles.portrait} ${sizeClass} ${className || ""}`}
    />
  );
}
