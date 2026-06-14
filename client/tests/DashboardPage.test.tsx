import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardPage } from "../src/pages/DashboardPage/DashboardPage";
import { renderWithProviders } from "./test-utils";
import * as reportsApi from "../src/api/reports";

vi.mock("../src/api/reports");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(reportsApi.summaryApi).mockResolvedValue({
    expense: "0",
    saving: "0",
    period: { from: "2026-01-01", to: "2026-12-31" },
  });
  vi.mocked(reportsApi.byCategoryApi).mockResolvedValue([]);
  vi.mocked(reportsApi.timeseriesApi).mockResolvedValue([]);
});

describe("DashboardPage", () => {
  it("клик по 'Год' переключает period и вызывает 3 запроса", async () => {
    renderWithProviders(<DashboardPage />);
    const user = userEvent.setup();

    // Ждём первоначальную загрузку (period=month по умолчанию)
    await waitFor(() => {
      expect(reportsApi.summaryApi).toHaveBeenCalledWith("month", undefined);
    });

    await user.click(screen.getByRole("tab", { name: "Год" }));

    await waitFor(() => {
      expect(reportsApi.summaryApi).toHaveBeenCalledWith("year", undefined);
      expect(reportsApi.byCategoryApi).toHaveBeenCalledWith("expense", "year", undefined);
      expect(reportsApi.timeseriesApi).toHaveBeenCalledWith("expense", "year", undefined);
    });
  });
});
