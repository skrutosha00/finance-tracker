import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionFormPage } from "../src/pages/TransactionFormPage/TransactionFormPage";
import { renderWithProviders } from "./test-utils";
import * as categoriesApi from "../src/api/categories";
import * as transactionsApi from "../src/api/transactions";
import { ApiError } from "../src/api/client";

vi.mock("../src/api/categories");
vi.mock("../src/api/transactions");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(categoriesApi.listCategoriesApi).mockResolvedValue([
    {
      id: "c1",
      userId: "u1",
      name: "Продукты",
      type: "expense",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ]);
});

describe("TransactionFormPage (create)", () => {
  it("422 от сервера показывает ошибку у поля amount", async () => {
    vi.mocked(transactionsApi.createTransactionApi).mockRejectedValueOnce(
      new ApiError(422, "VALIDATION_ERROR", "Ошибка валидации", [
        { path: ["amount"], message: "Сумма должна быть положительной" },
      ])
    );

    renderWithProviders(<TransactionFormPage mode="create" />);
    const user = userEvent.setup();

    // Подождать, пока загрузятся категории
    await screen.findByRole("option", { name: "Продукты" });

    await user.type(screen.getByLabelText(/сумма/i), "0.5");
    await user.selectOptions(screen.getByLabelText(/категория/i), "c1");
    await user.click(screen.getByRole("button", { name: /сохранить/i }));

    await waitFor(() => {
      expect(screen.getByText("Сумма должна быть положительной")).toBeInTheDocument();
    });
  });
});
