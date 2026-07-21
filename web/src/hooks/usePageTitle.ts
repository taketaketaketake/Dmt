import { useEffect } from "react";
import { useBranding } from "./useBranding";

export function usePageTitle(title?: string) {
  const branding = useBranding();
  useEffect(() => {
    document.title = title ? `${title} — ${branding.name}` : branding.name;
  }, [title, branding.name]);
}
