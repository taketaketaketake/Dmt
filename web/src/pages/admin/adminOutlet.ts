import { useOutletContext } from "react-router-dom";

/** Context exposed by AdminShell to admin child routes (e.g. refresh tab badges). */
export interface AdminOutletContext {
  refreshStats: () => void;
}

export function useAdminOutlet(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>();
}
