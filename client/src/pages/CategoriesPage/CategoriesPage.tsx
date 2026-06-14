import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "../../hooks/useCategories";
import type { Category, OperationType } from "../../api/categories";
import type { ApiError } from "../../api/client";
import styles from "./CategoriesPage.module.css";

const TITLES: Record<OperationType, string> = {
  expense: "Расходы",
  saving: "Сбережения",
};

export function CategoriesPage() {
  return (
    <div className={styles.page}>
      <h1>Категории</h1>
      <div className={styles.columns}>
        <CategoryColumn type="expense" />
        <CategoryColumn type="saving" />
      </div>
    </div>
  );
}

function CategoryColumn({ type }: { type: OperationType }) {
  const { data, isLoading } = useCategories(type);
  const create = useCreateCategory();
  const [newName, setNewName] = useState("");

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), type },
      {
        onSuccess: () => setNewName(""),
      }
    );
  };

  return (
    <section className={styles.column}>
      <h2>{TITLES[type]}</h2>
      <form onSubmit={submitNew} className={styles.newForm}>
        <input
          type="text"
          value={newName}
          maxLength={50}
          placeholder="Новая категория"
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" disabled={create.isPending}>
          Добавить
        </button>
      </form>
      {create.error && (
        <div className={styles.error}>{(create.error as ApiError).message}</div>
      )}
      {isLoading && <div>Загрузка…</div>}
      <ul className={styles.list}>
        {data?.map((cat) => (
          <CategoryRow key={cat.id} category={cat} />
        ))}
      </ul>
    </section>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [error, setError] = useState<ApiError | null>(null);

  const save = () => {
    if (!draft.trim() || draft === category.name) {
      setEditing(false);
      setDraft(category.name);
      return;
    }
    setError(null);
    update.mutate(
      { id: category.id, name: draft.trim() },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(err as ApiError),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm(`Удалить категорию «${category.name}»?`)) return;
    setError(null);
    del.mutate(category.id, {
      onError: (err) => setError(err as ApiError),
    });
  };

  return (
    <li className={styles.row}>
      {editing ? (
        <>
          <input
            className={styles.editInput}
            value={draft}
            maxLength={50}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(category.name);
              }
            }}
            autoFocus
          />
          <button type="button" onClick={save} disabled={update.isPending}>
            ОК
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(category.name);
            }}
          >
            Отмена
          </button>
        </>
      ) : (
        <>
          <span className={styles.name}>{category.name}</span>
          <button type="button" onClick={() => setEditing(true)}>
            Изменить
          </button>
          <button
            type="button"
            className={styles.delete}
            onClick={handleDelete}
            disabled={del.isPending}
          >
            Удалить
          </button>
        </>
      )}
      {error && (
        <div className={styles.error}>
          {error.code === "CATEGORY_HAS_TRANSACTIONS" ? (
            <>
              {error.message}.{" "}
              <Link to={`/journal?categoryId=${category.id}`}>Открыть журнал</Link>
            </>
          ) : (
            error.message
          )}
        </div>
      )}
    </li>
  );
}
