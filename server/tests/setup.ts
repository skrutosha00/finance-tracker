import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/db/prisma.js";

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "transactions", "categories", "users" RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
