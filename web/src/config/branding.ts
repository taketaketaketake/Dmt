// White-label branding, driven by build-time env (multi-tenant plan §11).
// Per-client deployments set VITE_BRAND_NAME etc. in the build environment;
// the fallbacks keep local dev, tests, and the default deployment working
// with no env setup. The <title> is handled separately in vite.config.ts
// (build-time HTML transform), which must use the same default name.
export const branding = {
  name: import.meta.env.VITE_BRAND_NAME || "Social Network",
  tagline:
    import.meta.env.VITE_BRAND_TAGLINE ||
    "A curated archive of builders in Detroit",
  // Optional logo image; when unset the Header renders the brand name as text.
  logoUrl: import.meta.env.VITE_LOGO_URL || "",
} as const;
