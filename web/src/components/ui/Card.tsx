import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "article" | "div" | "section";
}

export function Card({ children, className, as: Component = "div" }: CardProps) {
  return (
    <Component className={`${styles.card} ${className || ""}`}>
      {children}
    </Component>
  );
}
