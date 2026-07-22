import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./Login";

// Mock useAuth
const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../contexts", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock usePageTitle
vi.mock("../hooks/usePageTitle", () => ({
  usePageTitle: () => {},
}));

// Mock runtime branding (react-query backed; no provider in these tests)
vi.mock("../hooks/useBranding", () => ({
  useBranding: () => ({
    name: "Social Network",
    tagline: "A curated archive of builders in Detroit",
    logoUrl: null,
    faviconUrl: null,
    theme: "default",
  }),
}));

// Mock CSS modules
vi.mock("./Login.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockUseAuth.mockReset();
  });

  function renderLogin() {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  }

  it("renders email form with input and submit button", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });

    renderLogin();

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with email/i })).toBeInTheDocument();
  });

  it("redirects when already authenticated", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
    });

    renderLogin();

    // When authenticated, the form should not be visible (Navigate replaces it)
    expect(screen.queryByPlaceholderText("you@example.com")).not.toBeInTheDocument();
  });

  it("shows confirmation after successful submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows error on failed submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, message: "Rate limited" });
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => {
      expect(screen.getByText("Rate limited")).toBeInTheDocument();
    });
  });

  it("returns to form when 'Use a different email' is clicked", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/use a different email/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    });
  });
});
