import { apiFetch } from "./client";
import type { OperationType } from "./categories";

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: OperationType;
  amount: string;
  date: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TransactionFilter {
  type?: OperationType;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface TransactionInput {
  type: OperationType;
  amount: string;
  date: string;
  categoryId: string;
  comment?: string | null;
}

function buildQuery(filter: TransactionFilter): string {
  const params = new URLSearchParams();
  if (filter.type) params.set("type", filter.type);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.page !== undefined) params.set("page", String(filter.page));
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listTransactionsApi(filter: TransactionFilter): Promise<TransactionListResponse> {
  return apiFetch<TransactionListResponse>(`/transactions${buildQuery(filter)}`);
}

export function createTransactionApi(input: TransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTransactionApi(id: string, input: TransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTransactionApi(id: string): Promise<void> {
  return apiFetch<void>(`/transactions/${id}`, { method: "DELETE" });
}
