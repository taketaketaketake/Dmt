import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { auth, ApiError } from "../lib/api";
import type { User, Profile } from "../data/types";

// =============================================================================
// TYPES
// =============================================================================

type AuthProfile = Pick<
  Profile,
  "id" | "name" | "handle" | "bio" | "location" | "portraitUrl" | "approvalStatus"
>;

interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
  isApproved: boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await auth.me();
      setState({
        user: data.user,
        profile: data.profile,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Not authenticated - this is fine
        setState({
          user: null,
          profile: null,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          profile: null,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load user",
        });
      }
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string) => {
    try {
      const response = await auth.login(email);
      return { success: true, message: response.message };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Login failed",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Ignore errors - clear local state anyway
    }
    setState({
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refresh: fetchCurrentUser,
    isAuthenticated: !!state.user,
    isApproved: state.user?.status === "approved",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
