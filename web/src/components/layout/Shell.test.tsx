import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./Shell";

// Mock Header to avoid needing full auth context
vi.mock("./Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

// Mock CSS modules
vi.mock("./Shell.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

describe("Shell", () => {
  it("redirects to /login when isAuthenticated is false", () => {
    render(
      <MemoryRouter initialEntries={["/people"]}>
        <Routes>
          <Route element={<Shell isAuthenticated={false} />}>
            <Route path="/people" element={<div>People Page</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByText("People Page")).not.toBeInTheDocument();
  });

  it("renders Header and Outlet when isAuthenticated is true", () => {
    render(
      <MemoryRouter initialEntries={["/people"]}>
        <Routes>
          <Route element={<Shell isAuthenticated={true} />}>
            <Route path="/people" element={<div data-testid="people-page">People Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("people-page")).toBeInTheDocument();
  });
});
