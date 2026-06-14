import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import {
  createLoginRateLimiter,
  createRegisterRateLimiter,
} from "../../middleware/rateLimit.js";
import { LoginSchema, RegisterSchema } from "./auth.schema.js";
import { loginHandler, registerHandler } from "./auth.controller.js";

export function createAuthRouter() {
  const router = Router();

  router.post(
    "/register",
    createRegisterRateLimiter(),
    validateBody(RegisterSchema),
    registerHandler
  );

  router.post(
    "/login",
    createLoginRateLimiter(),
    validateBody(LoginSchema),
    loginHandler
  );

  return router;
}
