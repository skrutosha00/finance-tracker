import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCategories } from "../../hooks/useCategories";
import { useDeleteTransaction, useTransactions } from "../../hooks/useTransactions";
import type { OperationType } from "../../api/categories";
import type { Transaction } from "../../api/transactions";
import { formatDate, formatRub } from "../../lib/format";
import styles from "./JournalPage.module.css";

const PAGE_SIZE = 20;

export function JournalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = useMemo(() => {
    const type = (searchParams.get("type") || "") as OperationType | "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const page = Number(searchParams.get("page") || "1");
    return { type, dateFrom, dateTo, categoryId, page };
  }, [searchParams]);

  const queryFilter = {
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
    ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    page: filter.page,
    limit: PAGE_SIZE,
  };

  const transactions = useTransactions(queryFilter);
  const allCategories = useCategories();
  const del = useDeleteTransaction();

  const totalPages = transactions.data
    ? Math.max(1, Math.ceil(transactions.data.total / PAGE_SIZE))
    : 1;

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = Boolean(
    filter.type || filter.dateFrom || filter.dateTo || filter.categoryId
  );

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleDelete = (tx: Transaction) => {
    if (!confirm(`Удалить операцию на ${formatRub(tx.amount)}?`)) return;
    del.mutate(tx.id);
  };

  const filteredCategoriesForFilter = (allCategories.data ?? []).filter((c) =>
    filter.type ? c.type === filter.type : true
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Журнал операций</h1>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => navigate("/transactions/new")}
        >
          + Добавить операцию
        </button>
      </div>

      <div className={styles.filters}>
        <label>
          <span>Тип</span>
          <select
            value={filter.type}
            onChange={(e) => updateParam("type", e.target.value)}
          >
            <option value="">Все</option>
            <option value="expense">Расходы</option>
            <option value="saving">Сбережения</option>
          </select>
        </label>
        <label>
          <span>С</span>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
          />
        </label>
        <label>
          <span>По</span>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => updateParam("dateTo", e.target.value)}
          />
        </label>
        <label>
          <span>Категория</span>
          <select
            value={filter.categoryId}
            onChange={(e) => updateParam("categoryId", e.target.value)}
          >
            <option value="">Все</option>
            {filteredCategoriesForFilter.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === "expense" ? "р" : "с"})
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={resetFilters}
            title="Сбросить все фильтры"
          >
            Сбросить
          </button>
        )}
      </div>

      {transactions.isLoading && <div>Загрузка…</div>}

      {transactions.data && (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Категория</th>
                <th className={styles.right}>Сумма</th>
                <th>Комментарий</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Нет операций
                  </td>
                </tr>
              ) : (
                transactions.data.items.map((tx) => {
                  const cat = allCategories.data?.find((c) => c.id === tx.categoryId);
                  return (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.date)}</td>
                      <td>
                        <span
                          className={
                            tx.type === "expense" ? styles.expense : styles.saving
                          }
                        >
                          {tx.type === "expense" ? "Расход" : "Сбережение"}
                        </span>
                      </td>
                      <td>{cat?.name ?? "—"}</td>
                      <td className={styles.right}>{formatRub(tx.amount)}</td>
                      <td className={styles.comment}>{tx.comment}</td>
                      <td className={styles.actions}>
                        <Link
                          to={`/transactions/${tx.id}`}
                          state={{ transaction: tx }}
                        >
                          Редактировать
                        </Link>
                        <button type="button" onClick={() => handleDelete(tx)}>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={filter.page <= 1}
              onClick={() => updateParam("page", String(filter.page - 1))}
            >
              ← Предыдущая
            </button>
            <span>
              Страница {filter.page} из {totalPages} ({transactions.data.total} всего)
            </span>
            <button
              type="button"
              disabled={filter.page >= totalPages}
              onClick={() => updateParam("page", String(filter.page + 1))}
            >
              Следующая →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
