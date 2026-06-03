import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test/helpers";
import { mockProjects, mockNeeds, mockCategories } from "../test/mocks/api";
import { ProjectsPage } from "./Projects";

// Mock CSS modules
vi.mock("./Projects.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const TAXONOMY = {
  categories: [
    {
      id: "cat-1",
      name: "Product & Engineering",
      slug: "product-engineering",
      sortOrder: 0,
      options: [
        { id: "o1", name: "AI / ML expertise", slug: "ai-ml", sortOrder: 0 },
        { id: "o2", name: "MVP build support", slug: "mvp", sortOrder: 1 },
      ],
    },
  ],
};

const INDUSTRIES = {
  categories: [
    { id: "c1", name: "FinTech", slug: "fintech" },
    { id: "c2", name: "Health & Bio", slug: "health-bio" },
  ],
};

const PROJECTS = {
  projects: [
    {
      id: "pr1",
      title: "Alpha",
      description: "first project",
      status: "active",
      creator: { id: "u1", name: "Alice", handle: "alice", portraitUrl: undefined },
      needs: [{ id: "o1", name: "AI / ML expertise", slug: "ai-ml", categorySlug: "product-engineering" }],
      categories: [{ id: "c1", name: "FinTech", slug: "fintech" }],
    },
    {
      id: "pr2",
      title: "Beta",
      description: "second project",
      status: "active",
      creator: { id: "u2", name: "Bob", handle: "bob", portraitUrl: undefined },
      needs: [{ id: "o2", name: "MVP build support", slug: "mvp", categorySlug: "product-engineering" }],
      categories: [{ id: "c2", name: "Health & Bio", slug: "health-bio" }],
    },
  ],
};

describe("ProjectsPage", () => {
  beforeEach(() => {
    mockProjects.list.mockReset();
    mockNeeds.taxonomy.mockReset();
    mockCategories.list.mockReset();
    mockProjects.list.mockResolvedValue(PROJECTS);
    mockNeeds.taxonomy.mockResolvedValue(TAXONOMY);
    mockCategories.list.mockResolvedValue(INDUSTRIES);
  });

  it("renders all projects after loading", async () => {
    renderWithRouter(<ProjectsPage />);
    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  });

  it("search matches a category keyword, not just the title", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProjectsPage />);
    await screen.findByRole("heading", { name: "Alpha" });

    // "FinTech" is Alpha's category, not in its title/description
    await user.type(screen.getByPlaceholderText(/search projects/i), "FinTech");

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("filters by a selected need", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProjectsPage />);
    await screen.findByRole("heading", { name: "Alpha" });

    await user.click(screen.getByRole("button", { name: "Needs" }));
    await user.click(await screen.findByRole("checkbox", { name: "AI / ML expertise" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Beta" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
  });

  it("filters by a selected category", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProjectsPage />);
    await screen.findByRole("heading", { name: "Alpha" });

    await user.click(screen.getByRole("button", { name: "Category" }));
    await user.click(await screen.findByRole("checkbox", { name: "Health & Bio" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Alpha" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  });

  it("pre-fills the category filter from the ?category=<slug> URL param", async () => {
    // Arriving from a project's category badge: /projects?category=health-bio
    renderWithRouter(<ProjectsPage />, {
      initialEntries: ["/projects?category=health-bio"],
    });

    // Only Beta (Health & Bio) should show; Alpha (FinTech) is filtered out.
    expect(await screen.findByRole("heading", { name: "Beta" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Alpha" })).not.toBeInTheDocument();
    });

    // The active-filter chip reflects the pre-applied category (the "×" lives
    // in an aria-hidden span, so it is absent from the accessible name).
    expect(
      screen.getByRole("button", { name: "Health & Bio" })
    ).toBeInTheDocument();
  });
});
