import { Prisma, type OperationType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "../../errors/AppError.js";

export async function listCategories(userId: string, type?: OperationType) {
  return prisma.category.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(
  userId: string,
  data: { name: string; type: OperationType }
) {
  try {
    return await prisma.category.create({
      data: { userId, name: data.name, type: data.type },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "CATEGORY_DUPLICATE",
        "Категория с таким именем и типом уже существует"
      );
    }
    throw err;
  }
}

export async function updateCategory(
  userId: string,
  id: string,
  data: { name: string }
) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError("CATEGORY_NOT_FOUND", "Категория не найдена");
  }
  try {
    return await prisma.category.update({
      where: { id },
      data: { name: data.name },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "CATEGORY_DUPLICATE",
        "Категория с таким именем и типом уже существует"
      );
    }
    throw err;
  }
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError("CATEGORY_NOT_FOUND", "Категория не найдена");
  }
  const count = await prisma.transaction.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new BusinessRuleError(
      "CATEGORY_HAS_TRANSACTIONS",
      `Сначала перенесите или удалите ${count} связанных операций`,
      { count }
    );
  }
  await prisma.category.delete({ where: { id } });
}
