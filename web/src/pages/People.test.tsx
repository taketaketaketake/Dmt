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
    {
      id: "cat-1",
      name: "Product & Engineering",
      slug: "product-engineering",
      sortOrder: 0,
      options: [
        { id: "o1", name: "AI / ML expertise", slug: "ai-ml", sortOrder: 0, offerable: true },
        { id: "o2", name: "MVP build support", slug: "mvp", sortOrder: 1, offerable: true },
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
      skills: [{ id: "o1", name: "AI / ML expertise", slug: "ai-ml", categorySlug: "product-engineering" }],
    },
    {
      id: "p2",
      name: "Bob",
      handle: "bob",
      bio: "designer",
      location: "Ann Arbor",
      skills: [{ id: "o2", name: "MVP build support", slug: "mvp", categorySlug: "product-engineering" }],
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

  it("narrows the list with the search box", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PeoplePage />);

    await screen.findByRole("heading", { name: "Alice" });

    await user.type(
      screen.getByPlaceholderText(/search by name/i),
      "Alice"
    );

    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bob" })).not.toBeInTheDocument();
  });

  it("filters by a skill selected from the Skills dropdown", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PeoplePage />);

    await screen.findByRole("heading", { name: "Alice" });

    // Open the Skills dropdown, then check a skill only Alice has
    await user.click(screen.getByRole("button", { name: "Skills" }));
    await user.click(await screen.findByRole("checkbox", { name: "AI / ML expertise" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Bob" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
  });
});
