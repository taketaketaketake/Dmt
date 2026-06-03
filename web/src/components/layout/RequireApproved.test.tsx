import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireApproved } from "./RequireApproved";

const useAuthMock = vi.fn();
vi.mock("../../contexts", () => ({
  useAuth: () => useAuthMock(),
}));

function renderAt(authValue: unknown) {
  useAuthMock.mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={["/people"]}>
      <Routes>
        <Route element={<RequireApproved />}>
          <Route path="/people" element={<div data-testid="directory">Directory</div>} />
        </Route>
        <Route path="/account" element={<div data-testid="account">Account</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireApproved", () => {
  it("renders the directory for an approved member", () => {
    renderAt({ user: { status: "approved", isAdmin: false } });
    expect(screen.getByTestId("directory")).toBeInTheDocument();
  });

  it("renders the directory for an admin even if not approved", () => {
    renderAt({ user: { status: "pending", isAdmin: true } });
    expect(screen.getByTestId("directory")).toBeInTheDocument();
  });

  it("redirects a pending member to /account", () => {
    renderAt({ user: { status: "pending", isAdmin: false } });
    expect(screen.getByTestId("account")).toBeInTheDocument();
    expect(screen.queryByTestId("directory")).not.toBeInTheDocument();
  });

  it("redirects to /account when there is no user yet", () => {
    renderAt({ user: null });
    expect(screen.getByTestId("account")).toBeInTheDocument();
  });
});
