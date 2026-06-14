import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  byCategoryHandler,
  summaryHandler,
  timeseriesHandler,
} from "./reports.controller.js";

export function createReportsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get("/summary", summaryHandler);
  router.get("/by-category", byCategoryHandler);
  router.get("/timeseries", timeseriesHandler);
  return router;
}
