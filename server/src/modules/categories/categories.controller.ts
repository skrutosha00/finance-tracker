import type { NextFunction, Request, Response } from "express";
import * as categoriesService from "./categories.service.js";
import { CategoryListQuerySchema } from "./categories.schema.js";

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CategoryListQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const list = await categoriesService.listCategories(req.user!.id, parsed.data.type);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await categoriesService.createCategory(req.user!.id, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await categoriesService.updateCategory(
      req.user!.id,
      req.params.id!,
      req.body
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.deleteCategory(req.user!.id, req.params.id!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
