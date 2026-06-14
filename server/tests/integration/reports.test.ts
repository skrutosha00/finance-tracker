import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { registerAndLogin, type RegisteredUser } from "../helpers/auth.js";

let app: Express;
let user: RegisteredUser;
let prodId: string; // expense Продукты
let transId: string; // expense Транспорт
let savingId: string; // saving Резерв

beforeEach(async () => {
  app = buildApp();
  user = await registerAndLogin(app);
  const cats = await prisma.category.findMany({ where: { userId: user.id } });
  prodId = cats.find((c) => c.type === "expense" && c.name === "Продукты")!.id;
  transId = cats.find((c) => c.type === "expense" && c.name === "Транспорт")!.id;
  savingId = cats.find((c) => c.type === "saving" && c.name === "Резерв")!.id;
});

const auth = (req: request.Test, token: string) =>
  req.set("Authorization", `Bearer ${token}`);

describe("GET /api/reports/summary", () => {
  it("TC-RPT-01: 3 расхода и 1 сбережение в апреле -> summary совпадает", async () => {
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, categoryId: prodId, type: "expense", amount: "100", date: new Date("2026-04-05") },
        { userId: user.id, categoryId: prodId, type: "expense", amount: "200", date: new Date("2026-04-10") },
        { userId: user.id, categoryId: transId, type: "expense", amount: "300", date: new Date("2026-04-20") },
        { userId: user.id, categoryId: savingId, type: "saving", amount: "1000", date: new Date("2026-04-25") },
      ],
    });

    const res = await auth(
      request(app).get("/api/reports/summary?period=month&date=2026-04-15"),
      user.token
    );
    expect(res.status).toBe(200);
    expect(res.body.period).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    expect(Number(res.body.expense)).toBe(600);
    expect(Number(res.body.saving)).toBe(1000);
  });

  it("Пустой период -> нули", async () => {
    const res = await auth(
      request(app).get("/api/reports/summary?period=week&date=2026-04-15"),
      user.token
    );
    expect(res.status).toBe(200);
    expect(Number(res.body.expense)).toBe(0);
    expect(Number(res.body.saving)).toBe(0);
  });

  it("Невалидный period -> 422", async () => {
    const res = await auth(
      request(app).get("/api/reports/summary?period=lifetime"),
      user.token
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/reports/by-category", () => {
  it("TC-RPT-02: расходы по 2 категориям -> массив из 2 с правильными суммами", async () => {
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, categoryId: prodId, type: "expense", amount: "100", date: new Date("2026-04-05") },
        { userId: user.id, categoryId: prodId, type: "expense", amount: "200", date: new Date("2026-04-10") },
        { userId: user.id, categoryId: transId, type: "expense", amount: "500", date: new Date("2026-04-20") },
      ],
    });

    const res = await auth(
      request(app).get("/api/reports/by-category?type=expense&period=month&date=2026-04-15"),
      user.token
    );
    expect(res.status).toBe(200);
    const rows = res.body as Array<{ categoryName: string; sum: string }>;
    expect(rows).toHaveLength(2);
    // Сортировка DESC: 500 первым
    expect(rows[0]!.categoryName).toBe("Транспорт");
    expect(Number(rows[0]!.sum)).toBe(500);
    expect(rows[1]!.categoryName).toBe("Продукты");
    expect(Number(rows[1]!.sum)).toBe(300);
  });

  it("Категории без операций не попадают в отчёт", async () => {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: prodId,
        type: "expense",
        amount: "100",
        date: new Date("2026-04-05"),
      },
    });
    const res = await auth(
      request(app).get("/api/reports/by-category?type=expense&period=month&date=2026-04-15"),
      user.token
    );
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/reports/timeseries", () => {
  it("TC-RPT-03: расходы в 3 разных дня недели -> 3 бакета по дням", async () => {
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, categoryId: prodId, type: "expense", amount: "100", date: new Date("2026-04-13") }, // Mon
        { userId: user.id, categoryId: prodId, type: "expense", amount: "200", date: new Date("2026-04-15") }, // Wed
        { userId: user.id, categoryId: prodId, type: "expense", amount: "300", date: new Date("2026-04-19") }, // Sun
      ],
    });

    const res = await auth(
      request(app).get("/api/reports/timeseries?type=expense&period=week&date=2026-04-15"),
      user.token
    );
    expect(res.status).toBe(200);
    const rows = res.body as Array<{ bucket: string; sum: string }>;
    expect(rows).toHaveLength(3);
    expect(rows[0]!.bucket).toBe("2026-04-13");
    expect(rows[2]!.bucket).toBe("2026-04-19");
  });

  it("Year period -> бакеты по месяцам", async () => {
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, categoryId: prodId, type: "expense", amount: "100", date: new Date("2026-01-10") },
        { userId: user.id, categoryId: prodId, type: "expense", amount: "200", date: new Date("2026-01-20") },
        { userId: user.id, categoryId: prodId, type: "expense", amount: "300", date: new Date("2026-05-05") },
        { userId: user.id, categoryId: prodId, type: "expense", amount: "400", date: new Date("2026-12-31") },
      ],
    });
    const res = await auth(
      request(app).get("/api/reports/timeseries?type=expense&period=year&date=2026-06-15"),
      user.token
    );
    expect(res.status).toBe(200);
    const rows = res.body as Array<{ bucket: string; sum: string }>;
    expect(rows).toHaveLength(3);
    expect(rows[0]!.bucket).toBe("2026-01-01");
    expect(Number(rows[0]!.sum)).toBe(300);
    expect(rows[1]!.bucket).toBe("2026-05-01");
    expect(rows[2]!.bucket).toBe("2026-12-01");
  });
});

describe("TC-RPT-04: изоляция между пользователями", () => {
  it("Отчёт A не включает данные B", async () => {
    await prisma.transaction.create({
      data: { userId: user.id, categoryId: prodId, type: "expense", amount: "100", date: new Date("2026-04-05") },
    });

    const userB = await registerAndLogin(app);
    const catsB = await prisma.category.findMany({ where: { userId: userB.id } });
    const prodBId = catsB.find((c) => c.type === "expense" && c.name === "Продукты")!.id;
    await prisma.transaction.create({
      data: { userId: userB.id, categoryId: prodBId, type: "expense", amount: "99999", date: new Date("2026-04-05") },
    });

    const summary = await auth(
      request(app).get("/api/reports/summary?period=month&date=2026-04-15"),
      user.token
    );
    expect(Number(summary.body.expense)).toBe(100);

    const byCat = await auth(
      request(app).get("/api/reports/by-category?type=expense&period=month&date=2026-04-15"),
      user.token
    );
    expect(byCat.body).toHaveLength(1);
    expect(Number((byCat.body as Array<{ sum: string }>)[0]!.sum)).toBe(100);

    const ts = await auth(
      request(app).get("/api/reports/timeseries?type=expense&period=month&date=2026-04-15"),
      user.token
    );
    expect(Number((ts.body as Array<{ sum: string }>).reduce((acc, r) => acc + Number(r.sum), 0))).toBe(100);
  });
});
