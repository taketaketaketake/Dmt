import { useQuery } from "@tanstack/react-query";
import { branding as buildTimeBranding } from "../config/branding";

// =============================================================================
// RUNTIME BRANDING (multi-tenant plan §10 step 1)
// The deployment's branding is served by GET /api/tenant and fetched once on
// boot. Build-time values (VITE_BRAND_*) remain as the pre-fetch fallback so
// the first paint isn't unbranded, and as the offline/dev default.
// =============================================================================

export interface TenantBranding {
  name: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const fallback: TenantBranding = {
  name: buildTimeBranding.name,
  tagline: buildTimeBranding.tagline,
  logoUrl: buildTimeBranding.logoUrl || null,
  faviconUrl: null,
};

async function fetchTenant(): Promise<TenantBranding> {
  const response = await fetch("/api/tenant", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to load tenant branding");
  const data = (await response.json()) as { tenant: TenantBranding };
  return data.tenant;
}

export function useBranding(): TenantBranding {
  const { data } = useQuery({
    queryKey: ["tenant", "branding"],
    queryFn: fetchTenant,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
  return data ?? fallback;
}
