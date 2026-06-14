import { z } from "zod";
import { OperationTypeSchema } from "../categories/categories.schema.js";

export const PeriodSchema = z.enum(["week", "month", "year"]);

const DateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD")
  .optional();

export const SummaryQuerySchema = z.object({
  period: PeriodSchema,
  date: DateOnly,
});

export const ByCategoryQuerySchema = z.object({
  type: OperationTypeSchema,
  period: PeriodSchema,
  date: DateOnly,
});

export const TimeseriesQuerySchema = ByCategoryQuerySchema;

export type SummaryQuery = z.infer<typeof SummaryQuerySchema>;
export type ByCategoryQuery = z.infer<typeof ByCategoryQuerySchema>;
export type TimeseriesQuery = z.infer<typeof TimeseriesQuerySchema>;
