import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "./FilterSelect";

const groups = [
  { name: "Group A", options: [{ id: "o1", name: "Opt One" }, { id: "o2", name: "Opt Two" }] },
];

describe("FilterSelect", () => {
  it("is closed by default and opens on click", async () => {
    const user = userEvent.setup();
    render(
      <FilterSelect label="Skills" groups={groups} selected={new Set()} onToggle={vi.fn()} />
    );

    expect(screen.queryByRole("checkbox", { name: "Opt One" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skills" }));
    expect(screen.getByRole("checkbox", { name: "Opt One" })).toBeInTheDocument();
  });

  it("calls onToggle with the option id when checked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <FilterSelect label="Skills" groups={groups} selected={new Set()} onToggle={onToggle} />
    );

    await user.click(screen.getByRole("button", { name: "Skills" }));
    await user.click(screen.getByRole("checkbox", { name: "Opt Two" }));
    expect(onToggle).toHaveBeenCalledWith("o2");
  });

  it("shows a count of selected options in the trigger label", () => {
    render(
      <FilterSelect
        label="Skills"
        groups={groups}
        selected={new Set(["o1"])}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Skills \(1\)/ })).toBeInTheDocument();
  });
});
