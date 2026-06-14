import { useQuery } from "@tanstack/react-query";
import {
  byCategoryApi,
  summaryApi,
  timeseriesApi,
  type ByCategoryRow,
  type PeriodKey,
  type SummaryResponse,
  type TimeseriesRow,
} from "../api/reports";
import type { OperationType } from "../api/categories";

export function useSummary(period: PeriodKey, date?: string) {
  return useQuery<SummaryResponse>({
    queryKey: ["reports", "summary", period, date ?? null],
    queryFn: () => summaryApi(period, date),
  });
}

export function useByCategory(type: OperationType, period: PeriodKey, date?: string) {
  return useQuery<ByCategoryRow[]>({
    queryKey: ["reports", "by-category", type, period, date ?? null],
    queryFn: () => byCategoryApi(type, period, date),
  });
}

export function useTimeseries(type: OperationType, period: PeriodKey, date?: string) {
  return useQuery<TimeseriesRow[]>({
    queryKey: ["reports", "timeseries", type, period, date ?? null],
    queryFn: () => timeseriesApi(type, period, date),
  });
}
