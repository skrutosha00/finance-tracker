import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { loginApi, registerApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth";
import { FormError } from "../../components/FormError/FormError";
import styles from "../LoginPage/LoginPage.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      await registerApi(input);
      // Автологин после успешной регистрации
      return loginApi(input);
    },
    onSuccess: ({ token, user }) => {
      setSession(token, user);
      navigate("/", { replace: true });
    },
  });

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Регистрация</h1>
        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className={styles.field}>
          <span>Пароль (мин. 8 символов)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <FormError error={mutation.error as ApiError | null} />
        <button type="submit" className={styles.submit} disabled={mutation.isPending}>
          {mutation.isPending ? "Создание..." : "Зарегистрироваться"}
        </button>
        <div className={styles.altLink}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </form>
    </div>
  );
}
