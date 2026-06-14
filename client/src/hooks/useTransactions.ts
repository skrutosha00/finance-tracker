import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransactionApi,
  deleteTransactionApi,
  listTransactionsApi,
  updateTransactionApi,
  type TransactionFilter,
  type TransactionInput,
  type TransactionListResponse,
} from "../api/transactions";

export function useTransactions(filter: TransactionFilter) {
  return useQuery<TransactionListResponse>({
    queryKey: ["transactions", filter],
    queryFn: () => listTransactionsApi(filter),
    placeholderData: (prev) => prev,
  });
}

function invalidateRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) => createTransactionApi(input),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransactionApi(id, input),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransactionApi(id),
    onSuccess: () => invalidateRelated(qc),
  });
}
