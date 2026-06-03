import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test/helpers";
import { mockProfiles, mockNeeds } from "../test/mocks/api";
import { PeoplePage } from "./People";

// Mock CSS modules
vi.mock("./People.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const TAXONOMY = {
  categories: [
    // Skill categories still load but the Skills filter is not rendered
    {
      id: "cat-1",
      name: "Product & Engineering",
      slug: "product-engineering",
      sortOrder: 0,
      options: [{ id: "o1", name: "AI / ML expertise", slug: "ai-ml", sortOrder: 0 }],
    },
    {
      id: "cat-2",
      name: "People & Partners",
      slug: "people-partners",
      sortOrder: 1,
      options: [
        { id: "r1", name: "Advisor / mentor", slug: "advisor", sortOrder: 0 },
        { id: "r2", name: "Technical co-founder", slug: "cofounder", sortOrder: 1 },
      ],
    },
  ],
};

const PROFILES = {
  profiles: [
    {
      id: "p1",
      name: "Alice",
      handle: "alice",
      bio: "builder",
      location: "Detroit",
      skills: [{ id: "r1", name: "Advisor / mentor", slug: "advisor", categorySlug: "people-partners" }],
    },
    {
      id: "p2",
      name: "Bob",
      handle: "bob",
      bio: "designer",
      location: "Ann Arbor",
      skills: [{ id: "r2", name: "Technical co-founder", slug: "cofounder", categorySlug: "people-partners" }],
    },
  ],
};

describe("PeoplePage", () => {
  beforeEach(() => {
    mockProfiles.list.mockReset();
    mockNeeds.taxonomy.mockReset();
    mockProfiles.list.mockResolvedValue(PROFILES);
    mockNeeds.taxonomy.mockResolvedValue(TAXONOMY);
  });

  it("renders all profiles after loading", async () => {
    renderWithRouter(<PeoplePage />);

    expect(await screen.findByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bob" })).toBeInTheDocument();
  });

  it("does not render the Skills filter", async () => {
    renderWithRouter(<PeoplePage />);
    await screen.findByRole("heading", { name: "Alice" });

    expect(screen.queryByRole("button", { name: /^Skills/ })).not.toBeInTheDocument();
    // The People & Partners filter remains
    expect(screen.getByRole("button", { name: /People & Partners/ })).toBeInTheDocument();
  });

  it("narrows the list with the search box", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PeoplePage />);

    await screen.findByRole("heading", { name: "Alice" });

    await user.type(screen.getByPlaceholderText(/search by name/i), "Alice");

    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bob" })).not.toBeInTheDocument();
  });

  it("filters via the People & Partners dropdown", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PeoplePage />);

    await screen.findByRole("heading", { name: "Alice" });

    await user.click(screen.getByRole("button", { name: /People & Partners/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Advisor / mentor" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Bob" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
  });
});
