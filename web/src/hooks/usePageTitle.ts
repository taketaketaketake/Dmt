import { useEffect } from "react";
import { branding } from "../config/branding";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${branding.name}` : branding.name;
  }, [title]);
}
