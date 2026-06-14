import type { NextFunction, Request, Response } from "express";
import * as service from "./transactions.service.js";
import { ListTransactionsQuerySchema } from "./transactions.schema.js";

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ListTransactionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const result = await service.listTransactions(req.user!.id, parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await service.createTransaction(req.user!.id, req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await service.updateTransaction(
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
    await service.deleteTransaction(req.user!.id, req.params.id!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
