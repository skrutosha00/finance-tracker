# server

Backend: Node.js + Express + TypeScript + Prisma + Zod + JWT + bcrypt + express-rate-limit. Стек и зоны ответственности - [../../product.md#L236](../../product.md#L236).

## Структура

```
server/
  src/
    index.ts            entrypoint (HTTP-сервер)
    app.ts              сборка express-приложения (экспорт для Supertest)
    config/             env, константы
    db/                 PrismaClient singleton
    middleware/         auth (JWT), errorHandler, rateLimit для /api/auth/*
    modules/
      auth/             register, login, выдача JWT, базовые категории
      categories/       CRUD категорий
      transactions/     CRUD операций + фильтры
      reports/          summary, by-category, timeseries (SQL-агрегации)
    utils/
  prisma/
    schema.prisma       модели User, Category, Transaction
    migrations/
  tests/
    integration/        Supertest-сценарии по разделам API
    unit/               Vitest для агрегатных хелперов и валидации
```

Модули построены по схеме `<name>.routes.ts -> <name>.controller.ts -> <name>.service.ts` + `<name>.schema.ts` (Zod). Это допущение проекта, в `product.md` структура папок не зафиксирована.

## Скрипты (после `npm install`)

- `npm run dev` - dev-сервер с авто-перезапуском
- `npm run build` - сборка в `dist/`
- `npm start` - запуск production-сборки (используется systemd-юнитом)
- `npm test` - Vitest + Supertest по тестовой БД
- `npx prisma migrate dev` - применить миграции локально
- `npx prisma migrate deploy` - production-применение миграций (по [product.md:465](../../product.md#L465))

## Переменные окружения

См. `.env.example` (появится на этапе 1). Минимум: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `JWT_EXPIRES_IN`.
