import { Link } from "react-router-dom";
import { useAdminUsers } from "../../hooks/queries";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Users.module.css";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

export function UsersPage() {
  usePageTitle("Users");
  const { data: users = [], isPending, error } = useAdminUsers();

  if (isPending) {
    return <p className={styles.message}>Loading...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error.message || "Failed to load users"}</p>;
  }

  return (
    <div>
      <header className={styles.header}>
        <h2 className={styles.title}>Users</h2>
        <span className={styles.count}>{users.length} total</span>
      </header>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colEmail}>Email</span>
          <span className={styles.colProfile}>Profile</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colFlags}>Flags</span>
          <span className={styles.colActions}>Actions</span>
        </div>
        {users.map((user) => (
          <div key={user.id} className={styles.tableRow}>
            <span className={styles.colEmail}>{user.email}</span>
            <span className={styles.colProfile}>
              {user.profile ? (
                <span>
                  {user.profile.name}{" "}
                  <span className={styles.profileStatus}>
                    ({user.profile.approvalStatus})
                  </span>
                </span>
              ) : (
                <span className={styles.noProfile}>No profile</span>
              )}
            </span>
            <span className={styles.colStatus}>
              <span
                className={
                  user.status === "suspended"
                    ? styles.statusSuspended
                    : user.status === "approved"
                    ? styles.statusApproved
                    : styles.statusPending
                }
              >
                {statusLabels[user.status] || user.status}
              </span>
            </span>
            <span className={styles.colFlags}>
              {user.isAdmin && <span className={styles.flag}>Admin</span>}
              {user.isEmployer && <span className={styles.flag}>Employer</span>}
            </span>
            <span className={styles.colActions}>
              <Link to={`/admin/users/${user.id}`} className={styles.viewLink}>
                View
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
