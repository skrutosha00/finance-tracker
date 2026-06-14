import { apiFetch } from "./client";

export type OperationType = "expense" | "saving";

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: OperationType;
  createdAt: string;
  updatedAt: string;
}

export function listCategoriesApi(type?: OperationType): Promise<Category[]> {
  const qs = type ? `?type=${type}` : "";
  return apiFetch<Category[]>(`/categories${qs}`);
}

export function createCategoryApi(input: { name: string; type: OperationType }): Promise<Category> {
  return apiFetch<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCategoryApi(id: string, input: { name: string }): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteCategoryApi(id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: "DELETE" });
}
