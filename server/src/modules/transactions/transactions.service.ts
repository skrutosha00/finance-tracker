import { Prisma, type OperationType, type Transaction } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  BusinessRuleError,
  NotFoundError,
} from "../../errors/AppError.js";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "./transactions.schema.js";

export interface TransactionDto {
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

export function toTransactionDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    userId: tx.userId,
    categoryId: tx.categoryId,
    type: tx.type,
    amount: tx.amount.toString(),
    date: tx.date.toISOString().slice(0, 10),
    comment: tx.comment,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

async function assertCategoryCompatible(
  userId: string,
  categoryId: string,
  type: OperationType
) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    throw new BusinessRuleError("CATEGORY_NOT_FOUND", "Категория не найдена");
  }
  if (category.type !== type) {
    throw new BusinessRuleError(
      "CATEGORY_TYPE_MISMATCH",
      "Тип категории не совпадает с типом операции"
    );
  }
}

export async function listTransactions(userId: string, query: ListTransactionsQuery) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom + "T00:00:00Z") } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo + "T00:00:00Z") } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: items.map(toTransactionDto),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function createTransaction(userId: string, data: CreateTransactionInput) {
  await assertCategoryCompatible(userId, data.categoryId, data.type);
  const tx = await prisma.transaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      date: new Date(data.date + "T00:00:00Z"),
      comment: data.comment ?? null,
    },
  });
  return toTransactionDto(tx);
}

export async function updateTransaction(
  userId: string,
  id: string,
  data: UpdateTransactionInput
) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError("TRANSACTION_NOT_FOUND", "Операция не найдена");
  }
  await assertCategoryCompatible(userId, data.categoryId, data.type);
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      date: new Date(data.date + "T00:00:00Z"),
      comment: data.comment ?? null,
    },
  });
  return toTransactionDto(updated);
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError("TRANSACTION_NOT_FOUND", "Операция не найдена");
  }
  await prisma.transaction.delete({ where: { id } });
}
