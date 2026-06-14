import { z } from "zod";

export const OperationTypeSchema = z.enum(["expense", "saving"]);

export const CategoryListQuerySchema = z.object({
  type: OperationTypeSchema.optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно").max(50, "Максимум 50 символов"),
  type: OperationTypeSchema,
});

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно").max(50, "Максимум 50 символов"),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
