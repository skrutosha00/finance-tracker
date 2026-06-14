import { create } from "zustand";

export type PeriodKey = "week" | "month" | "year";
export type ReportType = "expense" | "saving";

interface UiState {
  selectedPeriod: PeriodKey;
  selectedReportType: ReportType;
  setPeriod: (p: PeriodKey) => void;
  setReportType: (t: ReportType) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedPeriod: "month",
  selectedReportType: "expense",
  setPeriod: (selectedPeriod) => set({ selectedPeriod }),
  setReportType: (selectedReportType) => set({ selectedReportType }),
}));
