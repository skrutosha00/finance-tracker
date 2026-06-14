import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { registerAndLogin, type RegisteredUser } from "../helpers/auth.js";

let app: Express;
let user: RegisteredUser;
let expenseCatId: string;
let savingCatId: string;

beforeEach(async () => {
  app = buildApp();
  user = await registerAndLogin(app);
  const cats = await prisma.category.findMany({ where: { userId: user.id } });
  expenseCatId = cats.find((c) => c.type === "expense" && c.name === "Продукты")!.id;
  savingCatId = cats.find((c) => c.type === "saving" && c.name === "Резерв")!.id;
});

const authReq = (req: request.Test, token: string) =>
  req.set("Authorization", `Bearer ${token}`);

describe("POST /api/transactions", () => {
  it("TC-TX-01: создание расхода -> 201", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "expense",
      amount: "150.50",
      date: "2026-04-15",
      categoryId: expenseCatId,
      comment: "Тест",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: "expense",
      amount: "150.5",
      date: "2026-04-15",
      categoryId: expenseCatId,
      comment: "Тест",
    });
  });

  it("TC-TX-02: type=saving с категорией expense -> 422 CATEGORY_TYPE_MISMATCH", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "saving",
      amount: "100",
      date: "2026-04-15",
      categoryId: expenseCatId,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
  });

  it("Категория из чужого аккаунта -> 422 CATEGORY_NOT_FOUND", async () => {
    const userB = await registerAndLogin(app);
    const res = await authReq(
      request(app).post("/api/transactions"),
      userB.token
    ).send({
      type: "expense",
      amount: "100",
      date: "2026-04-15",
      categoryId: expenseCatId, // принадлежит user, не userB
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CATEGORY_NOT_FOUND");
  });

  it("TC-TX-03: amount=-50 -> 422 VALIDATION_ERROR", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "expense",
      amount: "-50",
      date: "2026-04-15",
      categoryId: expenseCatId,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("amount=0 -> 422", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "expense",
      amount: "0",
      date: "2026-04-15",
      categoryId: expenseCatId,
    });
    expect(res.status).toBe(422);
  });

  it("amount=1.234 (3 знака) -> 422", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "expense",
      amount: "1.234",
      date: "2026-04-15",
      categoryId: expenseCatId,
    });
    expect(res.status).toBe(422);
  });

  it("date невалидная -> 422", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "expense",
      amount: "100",
      date: "not-a-date",
      categoryId: expenseCatId,
    });
    expect(res.status).toBe(422);
  });

  it("Создание сбережения с saving-категорией -> 201", async () => {
    const res = await authReq(
      request(app).post("/api/transactions"),
      user.token
    ).send({
      type: "saving",
      amount: "1000",
      date: "2026-04-15",
      categoryId: savingCatId,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("saving");
  });
});

describe("GET /api/transactions", () => {
  beforeEach(async () => {
    // Создаём фикстуры: 3 в апреле, 2 в мае, разные типы и категории
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, categoryId: expenseCatId, type: "expense", amount: "10", date: new Date("2026-04-01") },
        { userId: user.id, categoryId: expenseCatId, type: "expense", amount: "20", date: new Date("2026-04-10") },
        { userId: user.id, categoryId: expenseCatId, type: "expense", amount: "30", date: new Date("2026-04-20") },
        { userId: user.id, categoryId: expenseCatId, type: "expense", amount: "40", date: new Date("2026-05-05") },
        { userId: user.id, categoryId: savingCatId, type: "saving", amount: "500", date: new Date("2026-05-10") },
      ],
    });
  });

  it("Без фильтров -> все 5", async () => {
    const res = await authReq(request(app).get("/api/transactions"), user.token);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.items).toHaveLength(5);
  });

  it("TC-TX-04: dateFrom=2026-04-01&dateTo=2026-04-30 -> только апрель (3)", async () => {
    const res = await authReq(
      request(app).get("/api/transactions?dateFrom=2026-04-01&dateTo=2026-04-30"),
      user.token
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(3);
  });

  it("type=saving -> только 1 sсебережение", async () => {
    const res = await authReq(
      request(app).get("/api/transactions?type=saving"),
      user.token
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it("Сортировка date DESC", async () => {
    const res = await authReq(request(app).get("/api/transactions"), user.token);
    const dates = (res.body.items as Array<{ date: string }>).map((t) => t.date);
    const sortedDesc = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    expect(dates).toEqual(sortedDesc);
  });
});

describe("Пагинация", () => {
  it("TC-TX-05: 25 операций, page=2&limit=10 -> 10 элементов 11-20", async () => {
    // У нас уже user из beforeEach верхнего describe — но он сбрасывается через TRUNCATE.
    // beforeEach в setup.ts truncate -> user пересоздан.
    // создадим 25 операций с возрастающими датами для предсказуемой сортировки
    const data = Array.from({ length: 25 }, (_, i) => ({
      userId: user.id,
      categoryId: expenseCatId,
      type: "expense" as const,
      amount: `${i + 1}`,
      // дата от 2026-04-25 убывает к 2026-04-01 (для лёгкой проверки)
      date: new Date(`2026-04-${String(i + 1).padStart(2, "0")}`),
    }));
    await prisma.transaction.createMany({ data });

    const res = await authReq(
      request(app).get("/api/transactions?page=2&limit=10"),
      user.token
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(25);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(10);

    // Сортировка date DESC: на странице 2 элементы 11-20 от самых свежих
    // 25 дат: 2026-04-25 ... 2026-04-01. Стр.1 = 25..16, стр.2 = 15..6
    const dates = (res.body.items as Array<{ date: string }>).map((t) => t.date);
    expect(dates[0]).toBe("2026-04-15");
    expect(dates[9]).toBe("2026-04-06");
  });

  it("limit > 100 -> 422", async () => {
    const res = await authReq(
      request(app).get("/api/transactions?limit=101"),
      user.token
    );
    expect(res.status).toBe(422);
  });
});

describe("PUT/DELETE и изоляция", () => {
  it("Редактирование собственной операции", async () => {
    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: expenseCatId,
        type: "expense",
        amount: "100",
        date: new Date("2026-04-15"),
      },
    });

    const res = await authReq(
      request(app).put(`/api/transactions/${created.id}`),
      user.token
    ).send({
      type: "expense",
      amount: "200",
      date: "2026-04-16",
      categoryId: expenseCatId,
      comment: "обновлено",
    });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe("200");
    expect(res.body.date).toBe("2026-04-16");
    expect(res.body.comment).toBe("обновлено");
  });

  it("TC-TX-06: удаление чужой операции -> 404, в БД сохранилась", async () => {
    const txA = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: expenseCatId,
        type: "expense",
        amount: "100",
        date: new Date("2026-04-15"),
      },
    });

    const userB = await registerAndLogin(app);
    const res = await authReq(
      request(app).delete(`/api/transactions/${txA.id}`),
      userB.token
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TRANSACTION_NOT_FOUND");

    const stillExists = await prisma.transaction.findUnique({ where: { id: txA.id } });
    expect(stillExists).toBeTruthy();
  });

  it("Удаление собственной операции -> 204", async () => {
    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: expenseCatId,
        type: "expense",
        amount: "100",
        date: new Date("2026-04-15"),
      },
    });
    const res = await authReq(
      request(app).delete(`/api/transactions/${created.id}`),
      user.token
    );
    expect(res.status).toBe(204);

    const gone = await prisma.transaction.findUnique({ where: { id: created.id } });
    expect(gone).toBeNull();
  });
});
