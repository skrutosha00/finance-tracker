import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Слишком длинный пароль (макс. 72 байта UTF-8)"
  );

export const RegisterSchema = z.object({
  email: z.string().email("Некорректный email").transform((v) => v.toLowerCase()),
  password: passwordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email("Некорректный email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Пароль обязателен"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
