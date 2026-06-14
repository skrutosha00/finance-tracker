import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { RegisterPage } from "./pages/RegisterPage/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage";
import { JournalPage } from "./pages/JournalPage/JournalPage";
import { CategoriesPage } from "./pages/CategoriesPage/CategoriesPage";
import { TransactionFormPage } from "./pages/TransactionFormPage/TransactionFormPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "transactions/new", element: <TransactionFormPage mode="create" /> },
      { path: "transactions/:id", element: <TransactionFormPage mode="edit" /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
