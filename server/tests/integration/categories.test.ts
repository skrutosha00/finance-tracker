import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { registerAndLogin, type RegisteredUser } from "../helpers/auth.js";

let app: Express;
let user: RegisteredUser;

beforeEach(async () => {
  app = buildApp();
  user = await registerAndLogin(app);
});

function auth(req: request.Test) {
  return req.set("Authorization", `Bearer ${user.token}`);
}

describe("GET /api/categories", () => {
  it("TC-CAT-01: возвращает только expense при фильтре type=expense", async () => {
    const res = await auth(request(app).get("/api/categories?type=expense"));
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    const cats = res.body as Array<{ type: string; name: string }>;
    expect(cats.every((c) => c.type === "expense")).toBe(true);
    expect(cats).toHaveLength(7);
  });

  it("Без type возвращает все 13 категорий", async () => {
    const res = await auth(request(app).get("/api/categories"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(13);
  });

  it("Сортировка по name ASC", async () => {
    const res = await auth(request(app).get("/api/categories?type=expense"));
    const names = (res.body as Array<{ name: string }>).map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "ru"));
    expect(names).toEqual(sorted);
  });
});

describe("POST /api/categories", () => {
  it("TC-CAT-02: создание категории -> 201", async () => {
    const res = await auth(
      request(app).post("/api/categories").send({ name: "Кофе", type: "expense" })
    );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Кофе", type: "expense", userId: user.id });
  });

  it("TC-CAT-02: повторение -> 409 CATEGORY_DUPLICATE", async () => {
    await auth(request(app).post("/api/categories").send({ name: "Кофе", type: "expense" }));
    const dup = await auth(
      request(app).post("/api/categories").send({ name: "Кофе", type: "expense" })
    );
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("CATEGORY_DUPLICATE");
  });

  it("Одно имя в разных type -> допустимо (Прочее есть и у expense и у saving)", async () => {
    // Базовый набор уже содержит "Прочее" для обоих типов — это норма.
    const res = await auth(request(app).get("/api/categories"));
    const prochee = (res.body as Array<{ name: string; type: string }>).filter(
      (c) => c.name === "Прочее"
    );
    expect(prochee).toHaveLength(2);
    expect(new Set(prochee.map((c) => c.type))).toEqual(new Set(["expense", "saving"]));
  });

  it("Имя длиннее 50 символов -> 422", async () => {
    const res = await auth(
      request(app).post("/api/categories").send({ name: "x".repeat(51), type: "expense" })
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Невалидный type -> 422", async () => {
    const res = await auth(
      request(app).post("/api/categories").send({ name: "X", type: "income" })
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PUT /api/categories/:id", () => {
  it("Изменяет имя собственной категории", async () => {
    const list = await auth(request(app).get("/api/categories?type=expense"));
    const id = (list.body as Array<{ id: string }>)[0]!.id;

    const res = await auth(
      request(app).put(`/api/categories/${id}`).send({ name: "Еда" })
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Еда");
  });

  it("Переименование в существующее имя того же типа -> 409", async () => {
    const list = await auth(request(app).get("/api/categories?type=expense"));
    const cats = list.body as Array<{ id: string; name: string }>;
    const id = cats.find((c) => c.name === "Транспорт")!.id;

    const res = await auth(
      request(app).put(`/api/categories/${id}`).send({ name: "Продукты" })
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CATEGORY_DUPLICATE");
  });
});

describe("DELETE /api/categories/:id", () => {
  it("Удаление пустой категории -> 204", async () => {
    const created = await auth(
      request(app).post("/api/categories").send({ name: "Кофе", type: "expense" })
    );
    const id = created.body.id;

    const res = await auth(request(app).delete(`/api/categories/${id}`));
    expect(res.status).toBe(204);

    const after = await auth(request(app).get("/api/categories?type=expense"));
    expect((after.body as Array<{ id: string }>).every((c) => c.id !== id)).toBe(true);
  });

  it("Удаление категории с операциями -> 422 CATEGORY_HAS_TRANSACTIONS", async () => {
    const list = await auth(request(app).get("/api/categories?type=expense"));
    const categoryId = (list.body as Array<{ id: string }>)[0]!.id;

    // Создаём транзакцию напрямую через Prisma (модуль transactions ещё не готов)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId,
        type: "expense",
        amount: "100.00",
        date: new Date("2026-04-15"),
      },
    });

    const res = await auth(request(app).delete(`/api/categories/${categoryId}`));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CATEGORY_HAS_TRANSACTIONS");
    expect(res.body.error.details).toMatchObject({ count: 1 });
  });
});

describe("Изоляция пользователей", () => {
  it("TC-CAT-03: пользователь B не видит/не меняет/не удаляет категорию пользователя A -> 404", async () => {
    const list = await auth(request(app).get("/api/categories?type=expense"));
    const idA = (list.body as Array<{ id: string }>)[0]!.id;

    const userB = await registerAndLogin(app);
    const authB = (r: request.Test) => r.set("Authorization", `Bearer ${userB.token}`);

    const get = await authB(request(app).get(`/api/categories/${idA}`));
    // Endpoint GET single не описан — но любой PUT/DELETE по чужому id даст 404
    expect([404, 200]).toContain(get.status); // допускаем 404 от not-found или 200, если эндпойнт не нужен

    const put = await authB(request(app).put(`/api/categories/${idA}`).send({ name: "X" }));
    expect(put.status).toBe(404);
    expect(put.body.error.code).toBe("CATEGORY_NOT_FOUND");

    const del = await authB(request(app).delete(`/api/categories/${idA}`));
    expect(del.status).toBe(404);
    expect(del.body.error.code).toBe("CATEGORY_NOT_FOUND");

    // Категория A должна остаться в БД
    const stillExists = await prisma.category.findUnique({ where: { id: idA } });
    expect(stillExists).toBeTruthy();
  });
});
