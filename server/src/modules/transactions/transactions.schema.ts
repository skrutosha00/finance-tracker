import { z } from "zod";
import { OperationTypeSchema } from "../categories/categories.schema.js";

const AmountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v.toString() : v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Сумма должна быть положительным числом с не более чем двумя знаками после запятой",
  })
  .refine((v) => Number(v) > 0, { message: "Сумма должна быть положительной" });

const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD")
  .refine((v) => !Number.isNaN(new Date(v + "T00:00:00Z").getTime()), "Некорректная дата");

const CommentSchema = z.string().max(500, "Максимум 500 символов").optional().nullable();

export const CreateTransactionSchema = z.object({
  type: OperationTypeSchema,
  amount: AmountSchema,
  date: DateOnlySchema,
  categoryId: z.string().min(1),
  comment: CommentSchema,
});

export const UpdateTransactionSchema = CreateTransactionSchema;

export const ListTransactionsQuerySchema = z.object({
  type: OperationTypeSchema.optional(),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
  categoryId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;
