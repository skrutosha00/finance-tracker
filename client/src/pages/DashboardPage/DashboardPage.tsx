import { useEffect } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { useUiStore, type PeriodKey, type ReportType } from "../../store/ui";
import {
  useByCategory,
  useSummary,
  useTimeseries,
} from "../../hooks/useReports";
import { formatDate, formatRub } from "../../lib/format";
import { registerChartJs } from "../../lib/chart";
import styles from "./DashboardPage.module.css";

registerChartJs();

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

const PIE_COLORS = [
  "#2c5282",
  "#c0392b",
  "#1e8449",
  "#d68910",
  "#7d3c98",
  "#117a65",
  "#cb4335",
  "#5d6d7e",
  "#a04000",
  "#1f618d",
  "#922b21",
];

export function DashboardPage() {
  const period = useUiStore((s) => s.selectedPeriod);
  const setPeriod = useUiStore((s) => s.setPeriod);
  const reportType = useUiStore((s) => s.selectedReportType);
  const setReportType = useUiStore((s) => s.setReportType);

  const summary = useSummary(period);
  const byCategory = useByCategory(reportType, period);
  const timeseries = useTimeseries(reportType, period);

  // Сбрасываем reportType если, например, требуется (просто placeholder для будущего)
  useEffect(() => {}, [period]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Дашборд</h1>
        <div className={styles.periodTabs} role="tablist">
          {(["week", "month", "year"] as PeriodKey[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`${styles.tab} ${period === p ? styles.tabActive : ""}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.cards}>
        <SummaryCard
          title="Расходы"
          amount={summary.data?.expense}
          loading={summary.isLoading}
          from={summary.data?.period.from}
          to={summary.data?.period.to}
          variant="expense"
        />
        <SummaryCard
          title="Сбережения"
          amount={summary.data?.saving}
          loading={summary.isLoading}
          from={summary.data?.period.from}
          to={summary.data?.period.to}
          variant="saving"
        />
      </div>

      <div className={styles.typeToggle}>
        <span>Диаграммы по:</span>
        <button
          type="button"
          className={`${styles.toggleBtn} ${
            reportType === "expense" ? styles.toggleBtnActive : ""
          }`}
          onClick={() => setReportType("expense")}
        >
          Расходам
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${
            reportType === "saving" ? styles.toggleBtnActive : ""
          }`}
          onClick={() => setReportType("saving")}
        >
          Сбережениям
        </button>
      </div>

      <div className={styles.charts}>
        <section className={styles.chartCard}>
          <h3>По категориям</h3>
          {byCategory.isLoading && <div>Загрузка…</div>}
          {byCategory.data && byCategory.data.length === 0 && (
            <div className={styles.empty}>Нет данных за период</div>
          )}
          {byCategory.data && byCategory.data.length > 0 && (
            <Doughnut
              data={{
                labels: byCategory.data.map((c) => c.categoryName),
                datasets: [
                  {
                    data: byCategory.data.map((c) => Number(c.sum)),
                    backgroundColor: byCategory.data.map(
                      (_, i) => PIE_COLORS[i % PIE_COLORS.length]!
                    ),
                    borderWidth: 1,
                    borderColor: "#fff",
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" as const },
                    tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ${formatRub(ctx.parsed)}`,
                    },
                  },
                },
              }}
            />
          )}
        </section>

        <section className={styles.chartCard}>
          <h3>Динамика во времени</h3>
          {timeseries.isLoading && <div>Загрузка…</div>}
          {timeseries.data && timeseries.data.length === 0 && (
            <div className={styles.empty}>Нет данных за период</div>
          )}
          {timeseries.data && timeseries.data.length > 0 && (
            <Line
              data={{
                labels: timeseries.data.map((p) => formatDate(p.bucket)),
                datasets: [
                  {
                    label: reportType === "expense" ? "Расходы" : "Сбережения",
                    data: timeseries.data.map((p) => Number(p.sum)),
                    borderColor:
                      reportType === "expense"
                        ? "var(--color-accent-expense)"
                        : "var(--color-accent-saving)",
                    backgroundColor:
                      reportType === "expense"
                        ? "rgba(192, 57, 43, 0.15)"
                        : "rgba(30, 132, 73, 0.15)",
                    fill: true,
                    tension: 0.2,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${formatRub(ctx.parsed.y ?? 0)}`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (v) => formatRub(Number(v)),
                    },
                  },
                },
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  amount: string | undefined;
  loading: boolean;
  from?: string;
  to?: string;
  variant: ReportType;
}

function SummaryCard({ title, amount, loading, from, to, variant }: SummaryCardProps) {
  return (
    <div className={`${styles.card} ${styles[`card_${variant}`]}`}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardAmount}>
        {loading ? "…" : amount !== undefined ? formatRub(amount) : "—"}
      </div>
      {from && to && (
        <div className={styles.cardPeriod}>
          за период {formatDate(from)} – {formatDate(to)}
        </div>
      )}
    </div>
  );
}
