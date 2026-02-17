import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockProjects, mockNeeds } from "../../test/mocks/api";
import { NeedsEditor } from "./NeedsEditor";

// Mock CSS modules
vi.mock("./NeedsEditor.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const TAXONOMY = {
  categories: [
    {
      id: "cat-1",
      name: "Capital & Financial",
      slug: "capital",
      sortOrder: 1,
      options: [
        { id: "opt-1a", name: "Pre-seed funding", slug: "pre-seed", sortOrder: 1 },
        { id: "opt-1b", name: "Series A", slug: "series-a", sortOrder: 2 },
        { id: "opt-1c", name: "Grants", slug: "grants", sortOrder: 3 },
      ],
    },
    {
      id: "cat-2",
      name: "Talent & Team",
      slug: "talent",
      sortOrder: 2,
      options: [
        { id: "opt-2a", name: "Frontend dev", slug: "frontend", sortOrder: 1 },
        { id: "opt-2b", name: "Backend dev", slug: "backend", sortOrder: 2 },
      ],
    },
    {
      id: "cat-3",
      name: "Distribution",
      slug: "distribution",
      sortOrder: 3,
      options: [
        { id: "opt-3a", name: "Marketing", slug: "marketing", sortOrder: 1 },
      ],
    },
    {
      id: "cat-4",
      name: "Mentorship",
      slug: "mentorship",
      sortOrder: 4,
      options: [
        { id: "opt-4a", name: "Advisor", slug: "advisor", sortOrder: 1 },
      ],
    },
  ],
};

describe("NeedsEditor", () => {
  beforeEach(() => {
    mockNeeds.taxonomy.mockReset();
    mockProjects.getNeeds.mockReset();
    mockProjects.updateNeeds.mockReset();

    mockNeeds.taxonomy.mockResolvedValue(TAXONOMY);
    mockProjects.getNeeds.mockResolvedValue({ needs: [] });
  });

  it("is collapsed by default with expand button visible", () => {
    render(<NeedsEditor projectId="proj-1" />);

    expect(screen.getByRole("button", { name: /project needs/i })).toBeInTheDocument();
    // Editor content should not be visible
    expect(screen.queryByText(/select up to/i)).not.toBeInTheDocument();
  });

  it("loads taxonomy and needs when expanded", async () => {
    const user = userEvent.setup();
    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));

    await waitFor(() => {
      expect(screen.getByText(/select up to/i)).toBeInTheDocument();
    });

    expect(mockProjects.getNeeds).toHaveBeenCalledWith("proj-1");
  });

  it("allows adding a category (up to 3)", async () => {
    const user = userEvent.setup();
    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));

    await waitFor(() => {
      expect(screen.getByText(/select up to/i)).toBeInTheDocument();
    });

    // Add first category
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "cat-1");
    expect(screen.getByText("Capital & Financial")).toBeInTheDocument();

    // Add second
    await user.selectOptions(select, "cat-2");
    expect(screen.getByText("Talent & Team")).toBeInTheDocument();

    // Add third
    await user.selectOptions(select, "cat-3");
    expect(screen.getByText("Distribution")).toBeInTheDocument();

    // The 4th category should not be selectable (dropdown should be gone since 3 are selected)
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("allows toggling options (up to 2 per category)", async () => {
    const user = userEvent.setup();
    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));
    await waitFor(() => expect(screen.getByText(/select up to/i)).toBeInTheDocument());

    // Add Capital & Financial category (has 3 options)
    await user.selectOptions(screen.getByRole("combobox"), "cat-1");

    // Select first option
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]); // Pre-seed funding
    expect(checkboxes[0]).toBeChecked();

    // Select second option
    await user.click(checkboxes[1]); // Series A
    expect(checkboxes[1]).toBeChecked();

    // Third option should be disabled (max 2 reached)
    expect(checkboxes[2]).toBeDisabled();
  });

  it("enforces max context length of 180 chars", async () => {
    const user = userEvent.setup();
    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));
    await waitFor(() => expect(screen.getByText(/select up to/i)).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox"), "cat-1");

    const contextInput = screen.getByPlaceholderText(/brief context/i);
    // The input has maxLength=180 enforced at HTML level
    expect(contextInput).toHaveAttribute("maxLength", "180");
  });

  it("shows validation error for URLs in context on save", async () => {
    const user = userEvent.setup();
    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));
    await waitFor(() => expect(screen.getByText(/select up to/i)).toBeInTheDocument());

    // Add category and select an option
    await user.selectOptions(screen.getByRole("combobox"), "cat-1");
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    // Type a URL in context
    const contextInput = screen.getByPlaceholderText(/brief context/i);
    await user.type(contextInput, "Check out https://example.com");

    // Click save
    await user.click(screen.getByRole("button", { name: /save needs/i }));

    await waitFor(() => {
      expect(screen.getByText(/URLs are not allowed/i)).toBeInTheDocument();
    });

    expect(mockProjects.updateNeeds).not.toHaveBeenCalled();
  });

  it("calls API on save with correct payload", async () => {
    const user = userEvent.setup();
    mockProjects.updateNeeds.mockResolvedValue({ needs: [] });

    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));
    await waitFor(() => expect(screen.getByText(/select up to/i)).toBeInTheDocument());

    // Add category and select an option
    await user.selectOptions(screen.getByRole("combobox"), "cat-1");
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]); // Pre-seed funding

    // Click save
    await user.click(screen.getByRole("button", { name: /save needs/i }));

    await waitFor(() => {
      expect(mockProjects.updateNeeds).toHaveBeenCalledWith("proj-1", [
        {
          categoryId: "cat-1",
          optionIds: ["opt-1a"],
          contextText: "",
        },
      ]);
    });
  });

  it("reverts changes on cancel", async () => {
    const user = userEvent.setup();

    render(<NeedsEditor projectId="proj-1" />);

    await user.click(screen.getByRole("button", { name: /project needs/i }));
    await waitFor(() => expect(screen.getByText(/select up to/i)).toBeInTheDocument());

    // Add a category
    await user.selectOptions(screen.getByRole("combobox"), "cat-1");
    // The category card with a "Remove" button should be visible
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // The category card should be removed (no Remove button visible)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
    // Save/Cancel buttons should also be gone
    expect(screen.queryByRole("button", { name: /save needs/i })).not.toBeInTheDocument();
  });
});
