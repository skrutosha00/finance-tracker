import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "./categories.schema.js";
import {
  createHandler,
  deleteHandler,
  listHandler,
  updateHandler,
} from "./categories.controller.js";

export function createCategoriesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get("/", listHandler);
  router.post("/", validateBody(CreateCategorySchema), createHandler);
  router.put("/:id", validateBody(UpdateCategorySchema), updateHandler);
  router.delete("/:id", deleteHandler);
  return router;
}
