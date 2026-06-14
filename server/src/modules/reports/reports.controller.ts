import type { NextFunction, Request, Response } from "express";
import * as service from "./reports.service.js";
import {
  ByCategoryQuerySchema,
  SummaryQuerySchema,
  TimeseriesQuerySchema,
} from "./reports.schema.js";

export async function summaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const result = await service.getSummary(req.user!.id, parsed.data.period, parsed.data.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function byCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ByCategoryQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const result = await service.getByCategory(
      req.user!.id,
      parsed.data.type,
      parsed.data.period,
      parsed.data.date
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function timeseriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = TimeseriesQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const result = await service.getTimeseries(
      req.user!.id,
      parsed.data.type,
      parsed.data.period,
      parsed.data.date
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
