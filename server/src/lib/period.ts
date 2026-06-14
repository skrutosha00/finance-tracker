export type PeriodKey = "week" | "month" | "year";

export interface PeriodRange {
  from: Date;
  to: Date;
}

function parseDateString(dateStr?: string): Date {
  if (!dateStr) {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDay(date: Date): number {
  return date.getUTCDay(); // 0=Sun .. 6=Sat
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getPeriodRange(period: PeriodKey, dateStr?: string): PeriodRange {
  const ref = parseDateString(dateStr);
  switch (period) {
    case "week": {
      // понедельник = 1, воскресенье = 0
      const day = utcDay(ref);
      const offsetToMonday = day === 0 ? -6 : 1 - day;
      const from = addUtcDays(ref, offsetToMonday);
      const to = addUtcDays(from, 6);
      return { from, to };
    }
    case "month": {
      const from = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
      const to = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
      return { from, to };
    }
    case "year": {
      const from = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1));
      const to = new Date(Date.UTC(ref.getUTCFullYear(), 11, 31));
      return { from, to };
    }
  }
}

export function bucketUnit(period: PeriodKey): "day" | "month" {
  return period === "year" ? "month" : "day";
}

export function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
