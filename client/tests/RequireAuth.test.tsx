import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "../src/components/RequireAuth";
import { useAuthStore } from "../src/store/auth";

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

describe("RequireAuth", () => {
  it("без токена редиректит на /login", () => {
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div>Защищённый контент</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Страница входа</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Страница входа")).toBeInTheDocument();
    expect(screen.queryByText("Защищённый контент")).not.toBeInTheDocument();
  });

  it("с токеном показывает контент", () => {
    useAuthStore.setState({
      token: "fake-token",
      user: { id: "u1", email: "u@example.com" },
    });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div>Защищённый контент</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Страница входа</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Защищённый контент")).toBeInTheDocument();
    expect(screen.queryByText("Страница входа")).not.toBeInTheDocument();
  });
});
