import { Outlet, Navigate } from "react-router-dom";
import { Header } from "./Header";
import styles from "./Shell.module.css";

interface ShellProps {
  isAuthenticated?: boolean;
}

export function Shell({ isAuthenticated = false }: ShellProps) {
  // TODO: Re-enable auth check
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
