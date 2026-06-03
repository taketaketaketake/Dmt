import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient for the app. The defaults are tuned so that navigating
// between pages serves cached data instantly (no blank "Loading..." on
// revisit) while still revalidating in the background.
//
//  - staleTime 30s: a freshly-visited page won't refetch on immediate
//    re-navigation, which is the common "click in, click back" pattern.
//  - gcTime 5m: cached data is kept around long enough to make back-navigation
//    free without holding memory indefinitely.
//  - refetchOnWindowFocus off: avoids surprise refetches (and flicker) every
//    time the tab regains focus.
//  - retry 1: one retry smooths over transient network blips without making
//    genuine failures slow to surface.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
