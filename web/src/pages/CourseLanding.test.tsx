import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CourseLandingPage } from "./CourseLanding";

// Mock useAuth
const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../contexts", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the public curriculum query
const mockUsePublicCourses = vi.fn();

vi.mock("../hooks/queries", () => ({
  usePublicCourses: () => mockUsePublicCourses(),
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
    requiresAccessApproval: true,
  }),
}));

// Mock CSS modules
vi.mock("./CourseLanding.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const sampleCourses = [
  {
    slug: "founder-series",
    title: "Founder Basics",
    description: "Start here",
    lessonCount: 2,
    modules: [
      {
        title: "Getting Started",
        lessons: [{ title: "Why start a company" }, { title: "Finding an idea" }],
      },
    ],
  },
];

describe("CourseLandingPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockUseAuth.mockReset();
    mockUsePublicCourses.mockReset();

    mockUseAuth.mockReturnValue({ login: mockLogin, isAuthenticated: false });
    mockUsePublicCourses.mockReturnValue({
      data: sampleCourses,
      isPending: false,
      error: null,
    });
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <CourseLandingPage />
      </MemoryRouter>
    );
  }

  it("renders the branding-driven hero and curriculum from the public endpoint", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Social Network" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("A curated archive of builders in Detroit")
    ).toBeInTheDocument();
    expect(screen.getByText("Founder Basics")).toBeInTheDocument();
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Why start a company")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request access/i })
    ).toBeInTheDocument();
  });

  it("shows a fallback note when the curriculum is unavailable", () => {
    mockUsePublicCourses.mockReturnValue({
      data: [],
      isPending: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("shows confirmation with review expectations after submitting", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderPage();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "founder@example.com"
    );
    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    expect(mockLogin).toHaveBeenCalledWith("founder@example.com");
    expect(screen.getByText("founder@example.com")).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it("shows an error when the request fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, message: "Rate limited" });

    renderPage();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "founder@example.com"
    );
    await user.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() => {
      expect(screen.getByText("Rate limited")).toBeInTheDocument();
    });
  });

  it("offers a link to courses instead of the form when signed in", () => {
    mockUseAuth.mockReturnValue({ login: mockLogin, isAuthenticated: true });

    renderPage();

    expect(
      screen.queryByPlaceholderText("you@example.com")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to courses/i })).toHaveAttribute(
      "href",
      "/courses"
    );
  });
});
