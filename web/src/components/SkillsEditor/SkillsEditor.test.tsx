import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockProfiles, mockNeeds } from "../../test/mocks/api";
import { SkillsEditor } from "./SkillsEditor";

// Mock CSS modules
vi.mock("./SkillsEditor.module.css", () => ({
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

describe("SkillsEditor", () => {
  beforeEach(() => {
    mockNeeds.taxonomy.mockReset();
    mockProfiles.skills.mockReset();
    mockProfiles.updateSkills.mockReset();

    mockNeeds.taxonomy.mockResolvedValue(TAXONOMY);
    mockProfiles.skills.mockResolvedValue({ skills: [] });
  });

  it("loads the offerable taxonomy and renders skill chips", async () => {
    render(<SkillsEditor />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "AI / ML expertise" })).toBeInTheDocument();
    });
    expect(mockNeeds.taxonomy).toHaveBeenCalledWith({ offerable: true });
    expect(screen.getByRole("button", { name: "MVP build support" })).toBeInTheDocument();
    // No changes yet -> no save button
    expect(screen.queryByRole("button", { name: /save skills/i })).not.toBeInTheDocument();
  });

  it("pre-selects already-saved skills", async () => {
    mockProfiles.skills.mockResolvedValue({
      skills: [{ id: "o1", name: "AI / ML expertise", slug: "ai-ml", categorySlug: "product-engineering" }],
    });

    render(<SkillsEditor />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "AI / ML expertise" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  it("toggles a skill and saves the selection", async () => {
    const user = userEvent.setup();
    mockProfiles.updateSkills.mockResolvedValue({
      skills: [{ id: "o1", name: "AI / ML expertise", slug: "ai-ml", categorySlug: "product-engineering" }],
    });

    render(<SkillsEditor />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "AI / ML expertise" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "AI / ML expertise" }));

    const saveButton = await screen.findByRole("button", { name: /save skills/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockProfiles.updateSkills).toHaveBeenCalledWith(["o1"]);
    });
  });
});
