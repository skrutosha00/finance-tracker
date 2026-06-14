import type { ApiError } from "../../api/client";
import styles from "./FormError.module.css";

export function FormError({ error }: { error: ApiError | Error | null }) {
  if (!error) return null;
  return <div className={styles.formError}>{error.message}</div>;
}

export function FieldError({
  name,
  error,
}: {
  name: string;
  error: ApiError | null;
}) {
  if (!error || !error.details) return null;
  // Zod issues: [{ path: ["amount"], message: "..." }]
  const issues = error.details as Array<{ path: (string | number)[]; message: string }>;
  const issue = issues.find((i) => i.path[0] === name);
  if (!issue) return null;
  return <div className={styles.fieldError}>{issue.message}</div>;
}
