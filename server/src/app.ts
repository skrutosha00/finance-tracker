import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createCategoriesRouter } from "./modules/categories/categories.routes.js";
import { createTransactionsRouter } from "./modules/transactions/transactions.routes.js";
import { createReportsRouter } from "./modules/reports/reports.routes.js";

export function buildApp() {
  const app = express();

  // За обратным прокси (nginx в production) доверяем одному хопу,
  // чтобы express-rate-limit видел реальный IP клиента, а не 127.0.0.1.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", createAuthRouter());
  app.use("/api/categories", createCategoriesRouter());
  app.use("/api/transactions", createTransactionsRouter());
  app.use("/api/reports", createReportsRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Маршрут не найден" } });
  });

  app.use(errorHandler);

  return app;
}
