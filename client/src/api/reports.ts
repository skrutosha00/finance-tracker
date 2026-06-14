import { apiFetch } from "./client";
import type { OperationType } from "./categories";

export type PeriodKey = "week" | "month" | "year";

export interface SummaryResponse {
  expense: string;
  saving: string;
  period: { from: string; to: string };
}

export interface ByCategoryRow {
  categoryId: string;
  categoryName: string;
  sum: string;
}

export interface TimeseriesRow {
  bucket: string;
  sum: string;
}

export function summaryApi(period: PeriodKey, date?: string): Promise<SummaryResponse> {
  const params = new URLSearchParams({ period });
  if (date) params.set("date", date);
  return apiFetch<SummaryResponse>(`/reports/summary?${params.toString()}`);
}

export function byCategoryApi(
  type: OperationType,
  period: PeriodKey,
  date?: string
): Promise<ByCategoryRow[]> {
  const params = new URLSearchParams({ type, period });
  if (date) params.set("date", date);
  return apiFetch<ByCategoryRow[]>(`/reports/by-category?${params.toString()}`);
}

export function timeseriesApi(
  type: OperationType,
  period: PeriodKey,
  date?: string
): Promise<TimeseriesRow[]> {
  const params = new URLSearchParams({ type, period });
  if (date) params.set("date", date);
  return apiFetch<TimeseriesRow[]>(`/reports/timeseries?${params.toString()}`);
}
