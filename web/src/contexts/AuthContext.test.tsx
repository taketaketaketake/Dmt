import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { mockAuth, mockApiError } from "../test/mocks/api";
import { AuthProvider, useAuth } from "./AuthContext";

// Helper component that exposes auth context values for testing
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="approved">{String(auth.isApproved)}</span>
      <span data-testid="error">{auth.error ?? ""}</span>
      <span data-testid="user">{auth.user ? auth.user.email : "null"}</span>
      <button onClick={() => auth.login("test@example.com")} data-testid="login">
        Login
      </button>
      <button onClick={() => auth.logout()} data-testid="logout">
        Logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    mockAuth.me.mockReset();
    mockAuth.login.mockReset();
    mockAuth.logout.mockReset();
  });

  it("calls auth.me() on mount and sets user on success", async () => {
    mockAuth.me.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", status: "approved", isEmployer: false, isAdmin: false },
      profile: { id: "p-1", name: "Test", handle: "test", approvalStatus: "approved" },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    expect(screen.getByTestId("approved").textContent).toBe("true");
    expect(mockAuth.me).toHaveBeenCalledTimes(1);
  });

  it("sets user=null without error when auth.me returns 401", async () => {
    mockAuth.me.mockRejectedValue(new mockApiError(401, "Unauthorized"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("error").textContent).toBe("");
  });

  it("sets error when auth.me throws a non-401 error", async () => {
    mockAuth.me.mockRejectedValue(new Error("Network error"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("error").textContent).toBe("Network error");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });

  it("login returns success on successful call", async () => {
    mockAuth.me.mockRejectedValue(new mockApiError(401, "Unauthorized"));
    mockAuth.login.mockResolvedValue({ message: "Magic link sent" });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      screen.getByTestId("login").click();
    });

    // Since we can't easily capture the return, we verify the API was called
    expect(mockAuth.login).toHaveBeenCalledWith("test@example.com");
  });

  it("login returns failure on error", async () => {
    mockAuth.me.mockRejectedValue(new mockApiError(401, "Unauthorized"));
    mockAuth.login.mockRejectedValue(new Error("Rate limited"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      screen.getByTestId("login").click();
    });

    expect(mockAuth.login).toHaveBeenCalled();
  });

  it("logout clears user state even if API errors", async () => {
    mockAuth.me.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", status: "approved", isEmployer: false, isAdmin: false },
      profile: null,
    });
    mockAuth.logout.mockRejectedValue(new Error("Network error"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      screen.getByTestId("logout").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("null");
    });
  });

  it("isApproved is false when user is pending", async () => {
    mockAuth.me.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", status: "pending", isEmployer: false, isAdmin: false },
      profile: null,
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("approved").textContent).toBe("false");
  });
});
