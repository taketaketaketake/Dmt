import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Render a component wrapped in MemoryRouter (and a fresh QueryClient) for
 * testing. A new QueryClient per render keeps cache state isolated between
 * tests, and retries are disabled so failed-request assertions resolve fast.
 */
export function renderWithRouter(
  ui: ReactNode,
  options?: RenderOptions & { initialEntries?: string[] }
) {
  const { initialEntries = ["/"], ...renderOptions } = options ?? {};

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    renderOptions
  );
}

/**
 * Factory for creating mock auth context values.
 */
export function createMockAuthValue(overrides: Partial<{
  user: { id: string; email: string; status: string; isEmployer: boolean; isAdmin: boolean } | null;
  profile: { id: string; name: string; handle: string; approvalStatus: string } | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isApproved: boolean;
  login: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}> = {}) {
  return {
    user: null,
    profile: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    isApproved: false,
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
