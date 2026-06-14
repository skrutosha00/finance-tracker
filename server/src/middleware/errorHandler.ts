import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Ошибка валидации входных данных",
        details: err.issues,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { code: "UNIQUE_CONSTRAINT", message: "Конфликт уникальности" },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ресурс не найден" },
      });
    }
  }

  if (err instanceof SyntaxError && "body" in (err as any)) {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Некорректный JSON" },
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled error:", err);
  }

  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Внутренняя ошибка сервера" },
  });
}
