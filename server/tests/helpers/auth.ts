import request from "supertest";
import type { Express } from "express";

export interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

let userCounter = 0;

export function nextEmail(prefix = "u") {
  userCounter += 1;
  return `${prefix}${userCounter}+${Date.now()}@example.com`;
}

export async function registerAndLogin(
  app: Express,
  email: string = nextEmail(),
  password: string = "password123"
): Promise<RegisteredUser> {
  const reg = await request(app).post("/api/auth/register").send({ email, password });
  if (reg.status !== 201) {
    throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const login = await request(app).post("/api/auth/login").send({ email, password });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return {
    id: reg.body.id,
    email: reg.body.email,
    token: login.body.token,
  };
}
