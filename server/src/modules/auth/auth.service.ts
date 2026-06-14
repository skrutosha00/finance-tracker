import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError, ConflictError } from "../../errors/AppError.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Продукты",
  "Транспорт",
  "Жилье",
  "Здоровье",
  "Связь",
  "Развлечения",
  "Прочее",
];

const DEFAULT_SAVING_CATEGORIES = [
  "Резерв",
  "Накопления",
  "Вклад",
  "Крупная покупка",
  "Отпуск",
  "Прочее",
];

const BCRYPT_COST = 12;
const JWT_EXPIRES_IN = "24h";

export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email, passwordHash },
      });
      await tx.category.createMany({
        data: [
          ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
            userId: created.id,
            name,
            type: "expense" as const,
          })),
          ...DEFAULT_SAVING_CATEGORIES.map((name) => ({
            userId: created.id,
            name,
            type: "saving" as const,
          })),
        ],
      });
      return created;
    });
    return { id: user.id, email: user.email };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "USER_EMAIL_EXISTS",
        "Пользователь с таким email уже зарегистрирован"
      );
    }
    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const invalid = new AppError(401, "INVALID_CREDENTIALS", "Неверный email или пароль");
  if (!user) {
    // Выполнить bcrypt.compare даже без пользователя для согласованного времени ответа
    await bcrypt.compare(input.password, "$2b$12$invalidplaceholderinvalidplaceholderinvalidplaceholder");
    throw invalid;
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw invalid;
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user: { id: user.id, email: user.email } };
}
