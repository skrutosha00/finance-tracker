import { Prisma, type OperationType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  bucketUnit,
  formatDateIso,
  getPeriodRange,
  type PeriodKey,
} from "../../lib/period.js";

export interface SummaryResult {
  expense: string;
  saving: string;
  period: { from: string; to: string };
}

export async function getSummary(
  userId: string,
  period: PeriodKey,
  dateStr?: string
): Promise<SummaryResult> {
  const { from, to } = getPeriodRange(period, dateStr);
  // Используем смещение на полдень UTC, чтобы избежать TZ-shift в Prisma DateTime->DATE
  const fromShifted = new Date(from.getTime() + 12 * 60 * 60 * 1000);
  const toShifted = new Date(to.getTime() + 12 * 60 * 60 * 1000);
  const groups = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: fromShifted, lte: toShifted } },
    _sum: { amount: true },
  });
  const sumFor = (t: OperationType) =>
    groups.find((g) => g.type === t)?._sum.amount?.toString() ?? "0";

  return {
    expense: sumFor("expense"),
    saving: sumFor("saving"),
    period: { from: formatDateIso(from), to: formatDateIso(to) },
  };
}

export interface ByCategoryRow {
  categoryId: string;
  categoryName: string;
  sum: string;
}

export async function getByCategory(
  userId: string,
  type: OperationType,
  period: PeriodKey,
  dateStr?: string
): Promise<ByCategoryRow[]> {
  const { from, to } = getPeriodRange(period, dateStr);
  const fromIso = formatDateIso(from);
  const toIso = formatDateIso(to);
  const rows = await prisma.$queryRaw<
    Array<{ category_id: string; category_name: string; sum: Prisma.Decimal | string }>
  >`
    SELECT c.id AS category_id, c.name AS category_name, SUM(t.amount) AS sum
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ${userId}
      AND t.type = ${type}::"OperationType"
      AND t.date >= ${fromIso}::date
      AND t.date <= ${toIso}::date
    GROUP BY c.id, c.name
    ORDER BY sum DESC
  `;
  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    sum: r.sum.toString(),
  }));
}

export interface TimeseriesRow {
  bucket: string; // ISO date
  sum: string;
}

export async function getTimeseries(
  userId: string,
  type: OperationType,
  period: PeriodKey,
  dateStr?: string
): Promise<TimeseriesRow[]> {
  const { from, to } = getPeriodRange(period, dateStr);
  const unit = bucketUnit(period);
  const fromIso = formatDateIso(from);
  const toIso = formatDateIso(to);
  const rows = await prisma.$queryRaw<
    Array<{ bucket: string; sum: Prisma.Decimal | string }>
  >`
    SELECT to_char(date_trunc(${unit}::text, t.date::timestamp), 'YYYY-MM-DD') AS bucket,
           SUM(t.amount) AS sum
    FROM transactions t
    WHERE t.user_id = ${userId}
      AND t.type = ${type}::"OperationType"
      AND t.date >= ${fromIso}::date
      AND t.date <= ${toIso}::date
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  return rows.map((r) => ({
    bucket: r.bucket,
    sum: r.sum.toString(),
  }));
}
