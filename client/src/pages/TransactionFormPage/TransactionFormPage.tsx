import { useEffect, useState, type FormEvent } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import type { Transaction, TransactionInput } from "../../api/transactions";
import type { OperationType } from "../../api/categories";
import type { ApiError } from "../../api/client";
import { FieldError, FormError } from "../../components/FormError/FormError";
import { todayIso } from "../../lib/format";
import styles from "./TransactionFormPage.module.css";

interface Props {
  mode: "create" | "edit";
}

export function TransactionFormPage({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const initial = (location.state as { transaction?: Transaction } | null)?.transaction ?? null;

  // Если режим редактирования и нет state — редирект на журнал (нет GET /:id endpoint).
  if (mode === "edit" && !initial) {
    return <Navigate to="/journal" replace />;
  }

  const [type, setType] = useState<OperationType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");

  const categories = useCategories(type);
  // Если выбранная категория не соответствует новому типу — сбрасываем
  useEffect(() => {
    if (
      categoryId &&
      categories.data &&
      !categories.data.some((c) => c.id === categoryId)
    ) {
      setCategoryId("");
    }
  }, [type, categories.data, categoryId]);

  const createMut = useCreateTransaction();
  const updateMut = useUpdateTransaction();
  const mut = mode === "create" ? createMut : updateMut;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: TransactionInput = {
      type,
      amount,
      date,
      categoryId,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };
    if (mode === "create") {
      createMut.mutate(input, {
        onSuccess: () => navigate("/journal"),
      });
    } else {
      updateMut.mutate(
        { id: params.id!, input },
        { onSuccess: () => navigate("/journal") }
      );
    }
  };

  const error = mut.error as ApiError | null;

  return (
    <div className={styles.page}>
      <h1>{mode === "create" ? "Новая операция" : "Редактирование операции"}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset className={styles.field}>
          <legend>Тип</legend>
          <label>
            <input
              type="radio"
              name="type"
              value="expense"
              checked={type === "expense"}
              onChange={() => setType("expense")}
            />
            Расход
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="saving"
              checked={type === "saving"}
              onChange={() => setType("saving")}
            />
            Сбережение
          </label>
        </fieldset>

        <label className={styles.field}>
          <span>Сумма (₽)</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <FieldError name="amount" error={error} />
        </label>

        <label className={styles.field}>
          <span>Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <FieldError name="date" error={error} />
        </label>

        <label className={styles.field}>
          <span>Категория</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Выберите категорию…</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError name="categoryId" error={error} />
        </label>

        <label className={styles.field}>
          <span>Комментарий (необязательно)</span>
          <textarea
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </label>

        <FormError error={error} />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => navigate("/journal")}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submit}
            disabled={mut.isPending}
          >
            {mut.isPending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
