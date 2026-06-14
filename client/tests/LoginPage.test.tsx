import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "../src/pages/LoginPage/LoginPage";
import { renderWithProviders } from "./test-utils";
import * as authApi from "../src/api/auth";
import { ApiError } from "../src/api/client";

vi.mock("../src/api/auth");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("LoginPage", () => {
  it("показывает ошибку 401 INVALID_CREDENTIALS", async () => {
    vi.mocked(authApi.loginApi).mockRejectedValueOnce(
      new ApiError(401, "INVALID_CREDENTIALS", "Неверный email или пароль")
    );

    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/пароль/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /войти/i }));

    await waitFor(() => {
      expect(screen.getByText(/Неверный email или пароль/i)).toBeInTheDocument();
    });
    expect(authApi.loginApi).toHaveBeenCalled();
  });
});
