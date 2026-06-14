import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { nextEmail, registerAndLogin } from "../helpers/auth.js";

let app: Express;
beforeEach(() => {
  app = buildApp();
});

describe("POST /api/auth/register", () => {
  it("TC-AUTH-01: создаёт пользователя и базовые категории", async () => {
    const email = nextEmail();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email });
    expect(res.body.id).toBeTypeOf("string");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeTruthy();
    expect(user!.passwordHash).toMatch(/^\$2/);

    const categories = await prisma.category.findMany({ where: { userId: user!.id } });
    expect(categories.filter((c) => c.type === "expense")).toHaveLength(7);
    expect(categories.filter((c) => c.type === "saving")).toHaveLength(6);
  });

  it("TC-AUTH-02: повторная регистрация того же email -> 409", async () => {
    const email = nextEmail();
    await request(app).post("/api/auth/register").send({ email, password: "12345678" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USER_EMAIL_EXISTS");
  });

  it("Email нормализуется в lowercase", async () => {
    const email = `Mixed.Case${Date.now()}@Example.COM`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email.toLowerCase());
  });

  it("Слишком короткий пароль -> 422 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: nextEmail(), password: "short" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Пароль > 72 байт -> 422", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: nextEmail(), password: "a".repeat(73) });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  it("TC-AUTH-04: валидные учётные данные -> 200 + JWT", async () => {
    const email = nextEmail();
    const password = "password123";
    await request(app).post("/api/auth/register").send({ email, password });

    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email });
  });

  it("TC-AUTH-05: неверный пароль -> 401 INVALID_CREDENTIALS", async () => {
    const email = nextEmail();
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("TC-AUTH-05: несуществующий email -> 401 INVALID_CREDENTIALS (то же сообщение)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: nextEmail("noexist"), password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("rate-limit", () => {
  it("TC-AUTH-07: 4-й неуспешный login -> 429", async () => {
    const email = nextEmail("rate");
    await request(app).post("/api/auth/register").send({ email, password: "password123" });

    const r1 = await request(app).post("/api/auth/login").send({ email, password: "x" });
    const r2 = await request(app).post("/api/auth/login").send({ email, password: "x" });
    const r3 = await request(app).post("/api/auth/login").send({ email, password: "x" });
    const r4 = await request(app).post("/api/auth/login").send({ email, password: "x" });

    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(r3.status).toBe(401);
    expect(r4.status).toBe(429);
    expect(r4.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});

describe("защищённые маршруты", () => {
  it("TC-AUTH-06: без токена -> 401 UNAUTHORIZED, с токеном -> 200", async () => {
    const noAuth = await request(app).get("/api/categories");
    expect(noAuth.status).toBe(401);
    expect(noAuth.body.error.code).toBe("UNAUTHORIZED");

    const u = await registerAndLogin(app);
    const withAuth = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${u.token}`);
    expect(withAuth.status).toBe(200);
  });

  it("TC-AUTH-03: после регистрации возвращается 7 expense и 6 saving категорий", async () => {
    const u = await registerAndLogin(app);

    const res = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    const cats = res.body as Array<{ type: string }>;
    expect(cats.filter((c) => c.type === "expense")).toHaveLength(7);
    expect(cats.filter((c) => c.type === "saving")).toHaveLength(6);
  });
});
