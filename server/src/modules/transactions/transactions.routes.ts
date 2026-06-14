import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
} from "./transactions.schema.js";
import {
  createHandler,
  deleteHandler,
  listHandler,
  updateHandler,
} from "./transactions.controller.js";

export function createTransactionsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get("/", listHandler);
  router.post("/", validateBody(CreateTransactionSchema), createHandler);
  router.put("/:id", validateBody(UpdateTransactionSchema), updateHandler);
  router.delete("/:id", deleteHandler);
  return router;
}
