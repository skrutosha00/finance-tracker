# Project

Реализация продукта, описанного в [`../product.md`](../product.md). Источник истины — `../product.md`; при расхождениях правится код, а не спецификация ([product.md:478](../product.md#L478)). Главы 1–3 диплома ([`../chapters/`](../chapters/)) — дополнительный источник деталей (TTL, форматы, конкретные коды ошибок), но они **не отменяют** `product.md`. Если глава противоречит `product.md`, побеждает `product.md` и противоречие выносится в чат разработчиком.

## Содержание

- [Структура папок](#структура-папок)
- [Локальный запуск](#локальный-запуск)
- [Допущения](#допущения-нет-в-productmd-зафиксировано-здесь)
- [Контрактные решения](#контрактные-решения-извлечённые-из-productmd--главы-1-3)
- [Подробный план реализации](#подробный-план-реализации)
- [Тесты](#тесты)
- [Production](#production)

## Структура папок

```
project/
  client/        Vite + React + TypeScript SPA
  server/        Node.js + Express + Prisma backend
  deploy/        примеры nginx.conf и systemd-юнита
  README.md      этот файл
  .gitignore
  .nvmrc         фиксированная версия Node
```

`client/` и `server/` — два независимых npm-проекта со своими `package.json`. Монорепа с workspaces не используется: общего кода нет (Prisma-клиент только на сервере; на фронте Zod-валидации нет по [product.md:230](../product.md#L230); связь только через HTTP).

## Локальный запуск

Требуется: Node (версия из `.nvmrc`), локальная инсталляция PostgreSQL.

```bash
# 1. PostgreSQL
createdb finance_dev
createdb finance_test

# 2. backend
cd server
cp .env.example .env       # отредактировать DATABASE_URL и JWT_SECRET
npm install
npx prisma migrate dev
npm run dev                # слушает на :4000

# 3. frontend (другой терминал)
cd client
cp .env.example .env
npm install
npm run dev                # Vite на :5173, прокси /api -> :4000
```

## Допущения (нет в product.md, зафиксировано здесь)

Все пункты этого раздела — собственные решения исполнителя там, где `product.md` и главы 1–3 не дают ответа. Пользователь ревьюит их позже.

### Инфраструктура

- **PostgreSQL для разработки разработчик поднимает сам.** В репе нет `docker-compose.yml`, потому что Docker не упомянут в дипломе и его пришлось бы защищать отдельно.
- **Имена БД — `finance_dev` и `finance_test`** (совпадает с примером в [chapters/03_chapter_3.md:299](../chapters/03_chapter_3.md#L299) для dev).
- **Backend dev-порт — 4000**, frontend dev-порт — 5173. Берётся из [chapters/03_chapter_3.md:291](../chapters/03_chapter_3.md#L291) (там в примере `.env` `PORT=4000` и Nginx проксирует на `127.0.0.1:4000`). Vite проксирует `/api/*` на `:4000`, поэтому пути в клиентском коде совпадают с production-конфигом Nginx.
- **Тестовая БД** — отдельная `DATABASE_URL` в `.env.test`. Между тестами — `TRUNCATE ... CASCADE` по [chapters/03_chapter_3.md:17](../chapters/03_chapter_3.md#L17), не пересоздание схемы (быстрее).

### Раскладка кода

- **Два независимых npm-проекта** — нет корневого `package.json`, нет workspaces. Это решение нужно меньше защищать в дипломе.
- **Структура серверных модулей** — по схеме `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.schema.ts` (Zod). Доступ к Prisma инкапсулирован в `service`; контроллер только разбирает запрос и вызывает сервис; роутер навешивает middleware (auth, rate-limit, validateBody).
- **Структура клиентских папок** — по сценарию: `auth/`, `categories/`, `transactions/` (формы), `journal/` (список), `dashboard/`. Внутри каждой папки страницы, локальные компоненты и хуки.
- **Логические страницы фронта** — раскладка под URL ([chapters/02_chapter_2.md:520-533](../chapters/02_chapter_2.md#L520)):
  - `/login`, `/register` — публичные
  - `/` — DashboardPage (`/` именно дашборд, а не `/dashboard`)
  - `/journal` — JournalPage (список операций)
  - `/categories` — CategoriesPage
  - `/transactions/new` и `/transactions/:id` — TransactionFormPage (форма как отдельная страница, не модалка)

### Контрактные мелочи, не зафиксированные явно

- **Zod-ошибки → HTTP 422** с кодом `VALIDATION_ERROR` и полем `details` (массив `ZodIssue[]`). 400 зарезервирован для синтаксически невалидного JSON (которое выкидывает `express.json()`). Глава 2 в [chapters/02_chapter_2.md:257](../chapters/02_chapter_2.md#L257) пишет `400/422` без жёсткой границы; здесь граница проводится явно.
- **Email при регистрации/входе** нормализуется в lowercase через Zod-трансформ, чтобы `User@ex.com` и `user@ex.com` не создавали разных пользователей.
- **Длина пароля** — минимум 8, максимум 72 байта UTF-8 ([chapters/02_chapter_2.md:225](../chapters/02_chapter_2.md#L225)). Дополнительных требований к составу (цифры/спецсимволы) нет — не описано в дипломе, не добавляем.
- **Длина имени категории** — 1–50 символов. Не указано явно; ограничение взято для здравого смысла.
- **`date` в API** — ISO `YYYY-MM-DD` (без времени), на бэке `DateTime @db.Date`.
- **`amount` в JSON-ответах** — десятичная строка (`"123.45"`), а не число. По [chapters/02_chapter_2.md:221](../chapters/02_chapter_2.md#L221) и [chapters/02_chapter_2.md:479](../chapters/02_chapter_2.md#L479) — иначе теряется точность при JSON-сериализации `Decimal`.
- **JWT TTL — 24 часа**, поле payload — `sub: userId` ([chapters/02_chapter_2.md:227](../chapters/02_chapter_2.md#L227), [chapters/03_chapter_3.md:154](../chapters/03_chapter_3.md#L154)).
- **`localStorage` key — `'auth.token'`** ([chapters/02_chapter_2.md:605](../chapters/02_chapter_2.md#L605)).
- **Pagination defaults** — `page=1, limit=20, max(limit)=100`, sort `date DESC, createdAt DESC` ([chapters/02_chapter_2.md:273](../chapters/02_chapter_2.md#L273)).
- **Сортировка категорий** — по `name` ASC ([chapters/02_chapter_2.md:263](../chapters/02_chapter_2.md#L263)).
- **Удаление чужого ресурса — 404**, не 403 ([chapters/02_chapter_2.md:425](../chapters/02_chapter_2.md#L425)).
- **Удаление категории с операциями — 422 `CATEGORY_HAS_TRANSACTIONS`** ([chapters/02_chapter_2.md:269](../chapters/02_chapter_2.md#L269)).
- **PUT категории** — меняет только `name`, не `type` ([chapters/02_chapter_2.md:267](../chapters/02_chapter_2.md#L267)).
- **Сообщения об ошибках** — на русском (текстовая часть `message`); коды (`code`) — латиница в SCREAMING_SNAKE_CASE.
- **Локаль форматирования на фронте** — `ru-RU`, валюта RUB ([chapters/02_chapter_2.md:634](../chapters/02_chapter_2.md#L634)).
- **bcrypt (native), не bcryptjs** — production-вариант; cost-factor 12 ([chapters/01_chapter_1.md:228](../chapters/01_chapter_1.md#L228)).
- **CORS** — допускается только origin из env-переменной `CLIENT_ORIGIN` ([chapters/02_chapter_2.md:345](../chapters/02_chapter_2.md#L345)).
- **Регистрация не возвращает токен** — клиент сам делает второй запрос `POST /api/auth/login` для автологина после успешной регистрации ([chapters/02_chapter_2.md:624](../chapters/02_chapter_2.md#L624), таблица 2.1 в [chapters/02_chapter_2.md:207](../chapters/02_chapter_2.md#L207)).
- **ESLint / Prettier** не вводятся — в `product.md` и главах их нет, защищать на ревью пришлось бы отдельно. Используется только `tsc --noEmit` для type-check.

## Контрактные решения (извлечённые из product.md + главы 1-3)

Один сводный источник правды для реализации — чтобы не сверяться с тремя файлами при каждой задаче.

### Модель данных (Prisma)

Полностью по [chapters/02_chapter_2.md:101-183](../chapters/02_chapter_2.md#L101):

```prisma
enum OperationType { expense saving }

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String        @map("password_hash")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt       @map("updated_at")
  categories   Category[]
  transactions Transaction[]
  @@map("users")
}

model Category {
  id        String        @id @default(cuid())
  userId    String        @map("user_id")
  name      String
  type      OperationType
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt       @map("updated_at")
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  @@unique([userId, type, name])
  @@index([userId, type])
  @@map("categories")
}

model Transaction {
  id         String        @id @default(cuid())
  userId     String        @map("user_id")
  categoryId String        @map("category_id")
  type       OperationType
  amount     Decimal       @db.Decimal(12, 2)
  date       DateTime      @db.Date
  comment    String?       @db.VarChar(500)
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt       @map("updated_at")
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  @@index([userId, date])
  @@index([userId, categoryId])
  @@index([userId, type, date])
  @@map("transactions")
}
```

### Базовые категории нового пользователя

Создаются одной транзакцией Prisma вместе с записью User ([chapters/02_chapter_2.md:381-403](../chapters/02_chapter_2.md#L381)):

- expense: «Продукты», «Транспорт», «Жилье», «Здоровье», «Связь», «Развлечения», «Прочее» (7 шт.)
- saving: «Резерв», «Накопления», «Вклад», «Крупная покупка», «Отпуск», «Прочее» (6 шт.)

### REST API — единые соглашения

- Префикс всех маршрутов: `/api/`
- JWT: `Authorization: Bearer <token>`, TTL 24h, payload `{ sub: userId, iat, exp }`
- Список: `{ items, total, page, limit }`, sort `date DESC, createdAt DESC`
- Ошибка: `{ error: { code, message, details? } }`
- Денежные суммы в JSON: **строки** `"123.45"`
- Даты в JSON: ISO `YYYY-MM-DD`

### HTTP-коды

| Код | Когда                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200 | успешный GET/PUT                                                                                                                                   |
| 201 | успешный POST                                                                                                                                      |
| 204 | успешный DELETE                                                                                                                                    |
| 400 | синтаксически некорректный JSON (от `express.json()`)                                                                                              |
| 401 | нет токена / невалидный токен / неверные креды (`UNAUTHORIZED`, `INVALID_CREDENTIALS`)                                                             |
| 404 | ресурс не найден или принадлежит другому пользователю                                                                                              |
| 409 | конфликт уникальности (`USER_EMAIL_EXISTS`, `CATEGORY_DUPLICATE`)                                                                                  |
| 422 | Zod-валидация или бизнес-правило (`VALIDATION_ERROR`, `CATEGORY_TYPE_MISMATCH`, `CATEGORY_HAS_TRANSACTIONS`, `CATEGORY_NOT_FOUND` при создании tx) |
| 429 | rate-limit (`TOO_MANY_REQUESTS`)                                                                                                                   |
| 500 | непредвиденная ошибка (`INTERNAL_ERROR`, без раскрытия деталей)                                                                                    |

### Полный список endpoint-ов

Из [chapters/02_chapter_2.md:205-219](../chapters/02_chapter_2.md#L205):

| Метод  | Endpoint                   | Auth | Тело/Query                                     | Успех                                       |
| ------ | -------------------------- | ---- | ---------------------------------------------- | ------------------------------------------- |
| POST   | `/api/auth/register`       | —    | `{ email, password }`                          | `201 { id, email }`                         |
| POST   | `/api/auth/login`          | —    | `{ email, password }`                          | `200 { token, user }`                       |
| GET    | `/api/categories`          | +    | `?type?`                                       | `200 [Category]`                            |
| POST   | `/api/categories`          | +    | `{ name, type }`                               | `201 Category`                              |
| PUT    | `/api/categories/:id`      | +    | `{ name }`                                     | `200 Category`                              |
| DELETE | `/api/categories/:id`      | +    | —                                              | `204`                                       |
| GET    | `/api/transactions`        | +    | `?type,dateFrom,dateTo,categoryId,page,limit`  | `200 { items, total, page, limit }`         |
| POST   | `/api/transactions`        | +    | `{ type, amount, date, categoryId, comment? }` | `201 Transaction`                           |
| PUT    | `/api/transactions/:id`    | +    | то же                                          | `200 Transaction`                           |
| DELETE | `/api/transactions/:id`    | +    | —                                              | `204`                                       |
| GET    | `/api/reports/summary`     | +    | `?period,date?`                                | `200 { expense, saving, period:{from,to} }` |
| GET    | `/api/reports/by-category` | +    | `?type,period,date?`                           | `200 [{ categoryId, categoryName, sum }]`   |
| GET    | `/api/reports/timeseries`  | +    | `?type,period,date?`                           | `200 [{ bucket, sum }]`                     |

### Аналитика — период и бакеты

Из [chapters/02_chapter_2.md:462](../chapters/02_chapter_2.md#L462) и [chapters/02_chapter_2.md:316](../chapters/02_chapter_2.md#L316):

| period | from                            | to                            | bucket в timeseries |
| ------ | ------------------------------- | ----------------------------- | ------------------- |
| week   | понедельник недели опорной даты | воскресенье той же недели     | день                |
| month  | 1-е число месяца опорной даты   | последний день того же месяца | день                |
| year   | 1 января года опорной даты      | 31 декабря того же года       | месяц               |

### Rate-limit

- production: 10 регистраций / 15 мин на IP, 5 неуспешных входов / 15 мин на IP ([chapters/01_chapter_1.md:390](../chapters/01_chapter_1.md#L390))
- test env: 3 попытки / 60 сек ([chapters/03_chapter_3.md:91](../chapters/03_chapter_3.md#L91)) — конфиг берётся из env

### Безопасность

- bcrypt cost=12, пароль 8–72 байта ([chapters/01_chapter_1.md:228](../chapters/01_chapter_1.md#L228), [chapters/01_chapter_1.md:384](../chapters/01_chapter_1.md#L384))
- одинаковый ответ 401 `INVALID_CREDENTIALS` для «email не найден» и «пароль неверный» — защита от user enumeration ([chapters/02_chapter_2.md:227](../chapters/02_chapter_2.md#L227))
- каждый Prisma-запрос к ресурсу пользователя обязательно фильтруется по `userId: req.user.id` (третий уровень защиты по [chapters/02_chapter_2.md:410](../chapters/02_chapter_2.md#L410))
- `prisma.$queryRaw` — только с плейсхолдерами `$1, $2, …`, никакой конкатенации строк ([chapters/03_chapter_3.md:164](../chapters/03_chapter_3.md#L164))
- централизованный errorHandler преобразует `ZodError` → 422, `Prisma.PrismaClientKnownRequestError` (`P2002`) → 409, всё прочее → 500 без деталей

### Frontend — состояние и слой запросов

- Zustand `useAuthStore`: `{ token, user, setSession, clearSession }`, синхронизация с `localStorage['auth.token']` ([chapters/02_chapter_2.md:601-616](../chapters/02_chapter_2.md#L601))
- Zustand `useUiStore` (или часть auth-стора): `selectedPeriod: 'week'|'month'|'year'`, по умолчанию `'month'`
- TanStack Query — для всех серверных данных; `keepPreviousData: true` для журнала ([chapters/02_chapter_2.md:577](../chapters/02_chapter_2.md#L577)); мутации инвалидируют `['transactions']` и `['reports']`
- `apiFetch<T>` — единая обёртка над `fetch`, подставляет токен и единообразно разбирает ошибки ([chapters/02_chapter_2.md:544](../chapters/02_chapter_2.md#L544))
- Класс `ApiError(status, code, message, details?)` — для проброса в компоненты

### Дашборд — раскладка

- сверху: переключатель периода (week/month/year)
- две карточки сумм (расходы, сбережения) с пометкой «за период от _from_ до _to_» ([chapters/02_chapter_2.md:685](../chapters/02_chapter_2.md#L685))
- общий тоггл «расходы/сбережения» над диаграммами ([chapters/02_chapter_2.md:636](../chapters/02_chapter_2.md#L636))
- круговая диаграмма (`Doughnut` из `react-chartjs-2`) — по `by-category`
- линейный график — по `timeseries`
- категории с нулевой суммой в круговой диаграмме не показываются ([chapters/02_chapter_2.md:689](../chapters/02_chapter_2.md#L689))

## Подробный план реализации

10 этапов. После каждого — зелёный тест (для бэка) или ручная проверка (для фронта). Этапы линейные, без параллелизма: бэк целиком → фронт целиком.

### Этап 0 — фундамент `server/`

1. `cd project/server && npm init -y`.
2. Зависимости:
   - prod: `express @prisma/client bcrypt jsonwebtoken zod express-rate-limit cors dotenv`
   - dev: `typescript tsx @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors vitest supertest @types/supertest prisma`
3. `npx tsc --init` → `target: ES2022, module: NodeNext, moduleResolution: NodeNext, strict: true, outDir: dist, rootDir: src`.
4. `npx prisma init`. В `schema.prisma` — модели из раздела «Контрактные решения». `DATABASE_URL` пробрасывается из env.
5. Создать `finance_dev` и `finance_test` в локальном PG; `npx prisma migrate dev --name init`.
6. Скелет `src/`:
   - `index.ts` — `app.listen(env.PORT)`
   - `app.ts` — сборка Express (экспортируется для Supertest, без `listen`)
   - `config/env.ts` — Zod-схема env-переменных, читает `process.env`, бросает понятную ошибку при отсутствии
   - `db/prisma.ts` — singleton `PrismaClient`
   - `middleware/errorHandler.ts` — централизованный обработчик
   - `middleware/requireAuth.ts` — проверка JWT
   - `middleware/validateBody.ts` — обёртка над Zod-схемой
   - `middleware/rateLimit.ts` — фабрики `registerRateLimiter` и `loginRateLimiter` с разными лимитами для prod/test
   - `errors/AppError.ts` — базовый класс + `ConflictError`, `NotFoundError`, `ValidationError`, `BusinessRuleError`
7. `GET /api/health` → `200 { ok: true }` — для проверки, что приложение поднимается.

**Выход этапа:** `npm run dev` поднимается на `:4000`, `curl :4000/api/health` отдаёт 200.

### Этап 1 — auth

Файлы: `modules/auth/{auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schema.ts}`.

1. `auth.schema.ts`: `RegisterSchema` и `LoginSchema` (email lowercase + email-формат, password 8–72 байта UTF-8).
2. `auth.service.ts`:
   - `register({ email, password })` — `prisma.$transaction(async tx => ...)`: проверить `findUnique` по email; `bcrypt.hash(password, 12)`; создать User; `tx.category.createMany(...)` с двумя списками. Возвращает `{ id, email }`. При найденном email — `throw new ConflictError('USER_EMAIL_EXISTS', ...)`.
   - `login({ email, password })` — `findUnique` + `bcrypt.compare`; при провале — **одинаковый** `throw new AppError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль')`. При успехе — `jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '24h' })`, возвращает `{ token, user: { id, email } }`.
3. `auth.controller.ts` — две функции, ловят ошибки через `next(err)`.
4. `auth.routes.ts` — `POST /register` с `registerRateLimiter + validateBody(RegisterSchema)`, `POST /login` с `loginRateLimiter + validateBody(LoginSchema)`.

**Тесты `tests/integration/auth.test.ts` (Supertest):**

- TC-AUTH-01: `POST /api/auth/register` с валидными данными → 201; в БД есть User с `passwordHash` matching `/^\$2/`; категории: 7 expense + 6 saving.
- TC-AUTH-02: повторная регистрация того же email → 409 `USER_EMAIL_EXISTS`.
- TC-AUTH-03: после регистрации `GET /api/categories` (с токеном из автологина) возвращает 13 категорий правильных типов.
- TC-AUTH-04: `POST /login` валидными → 200 + token + user.
- TC-AUTH-05: `POST /login` неверным паролем → 401 `INVALID_CREDENTIALS`; то же сообщение для несуществующего email.
- TC-AUTH-06: `GET /api/categories` без токена → 401; с токеном → 200.
- TC-AUTH-07: 4-й неуспешный `POST /login` подряд → 429 (в test env лимит 3/60s).

Helper `tests/helpers/auth.ts`: `registerAndLogin(email, password) → token`.

### Этап 2 — categories

Файлы: `modules/categories/...`.

1. `categories.schema.ts`: `CreateCategorySchema` (`name 1-50`, `type` enum), `UpdateCategorySchema` (`name 1-50`).
2. `categories.service.ts`:
   - `list(userId, type?)` — `findMany({ where: { userId, type? }, orderBy: { name: 'asc' } })`.
   - `create(userId, { name, type })` — `prisma.category.create`, ловит `P2002` → `ConflictError('CATEGORY_DUPLICATE', ...)`.
   - `update(userId, id, { name })` — `findFirst({ where: { id, userId } })`, если нет → 404; иначе `update`. Ловит `P2002` так же.
   - `delete(userId, id)` — `findFirst` для проверки владения; `prisma.transaction.count({ where: { categoryId: id } })` — если > 0 → `BusinessRuleError(422, 'CATEGORY_HAS_TRANSACTIONS', 'Сначала перенесите или удалите N связанных операций', { count })`. Иначе `prisma.category.delete`.
3. Контроллер + роутер (`requireAuth + validateBody`).

**Тесты:** TC-CAT-01..03 + create/update/delete + cross-user isolation + delete with linked transactions.

### Этап 3 — transactions

Файлы: `modules/transactions/...`.

1. `transactions.schema.ts`:
   - `CreateTransactionSchema` — `type` enum, `amount` строка десятичного формата `^\d+(\.\d{1,2})?$` с положительным значением (на бэке преобразуется в `Decimal`/`Prisma.Decimal`), `date` ISO `YYYY-MM-DD` (`z.string().regex(...)`), `categoryId` строка, `comment` опциональная строка ≤500.
   - `UpdateTransactionSchema` — то же.
   - `ListQuerySchema` — все параметры опциональные; `page` дефолт 1, `limit` дефолт 20 (max 100), `dateFrom`/`dateTo` ISO.
2. `transactions.service.ts`:
   - `list(userId, filter)` — `findMany` + `count` параллельно через `prisma.$transaction([...])`. `where: { userId, type?, categoryId?, date: { gte: dateFrom?, lte: dateTo? } }`. Сортировка `date DESC, createdAt DESC`. Возвращает `{ items, total, page, limit }`.
   - `create(userId, data)` — общий хелпер `assertCategoryCompatible(userId, categoryId, type)`: `prisma.category.findFirst({ where: { id, userId } })` → 422 `CATEGORY_NOT_FOUND` или 422 `CATEGORY_TYPE_MISMATCH`; затем `prisma.transaction.create`.
   - `update(userId, id, data)` — `findFirst` владения → 404 `TRANSACTION_NOT_FOUND`; assertCategory; `update`.
   - `delete(userId, id)` — `findFirst` + `delete`.
3. **Сериализация ответа:** Prisma возвращает `Decimal` объекты. Добавить мапер `toTransactionDto(tx)`, конвертирующий `amount` в строку через `tx.amount.toString()` и `date` в `YYYY-MM-DD` (`tx.date.toISOString().slice(0, 10)`).

**Тесты:** TC-TX-01..06 + валидация суммы (0, -1, 1.234), валидация даты, фильтрация по type/период/категория, пагинация (создаём 25 операций, проверяем `page=2&limit=10` → 10 элементов).

### Этап 4 — reports

Файлы: `modules/reports/...`.

1. `reports.schema.ts` — `period` enum, `date` опциональный ISO, `type` enum для by-category и timeseries.
2. `lib/period.ts`:

   ```ts
   export function getPeriodRange(period, dateStr?): { from: Date; to: Date };
   ```

   - неделя — ISO-неделя (понедельник началом)
   - месяц — `startOfMonth` / `endOfMonth`
   - год — `startOfYear` / `endOfYear`
   - Реализовать самостоятельно через `Date` без зависимостей (избежать `date-fns` если можно).
   - Unit-тесты в `tests/unit/period.test.ts` на граничные случаи: воскресенье, последний день года, 29 февраля.

3. `reports.service.ts`:
   - `summary(userId, period, date)` — `prisma.transaction.groupBy({ by: ['type'], where: { userId, date: { gte, lte } }, _sum: { amount: true } })` → собрать `expense`/`saving` в строковом виде; вернуть `{ expense, saving, period: { from, to } }`.
   - `byCategory(userId, type, period, date)` — `prisma.$queryRaw<...>` с SQL из [chapters/02_chapter_2.md:323](../chapters/02_chapter_2.md#L323).
   - `timeseries(userId, type, period, date)` — `prisma.$queryRaw` с `date_trunc($1, date)`, где `$1` — `'day'` для week/month, `'month'` для year.
   - Сумму конвертить в строку (`Decimal.toString()`).
4. Контроллер + роутер.

**Тесты:** TC-RPT-01..04. Сценарий: создать 3 расхода и 1 сбережение в апреле, проверить summary; распределение по 2 категориям → by-category; 3 разных дня в неделе → timeseries; пользователь B не виден в отчётах A.

### Этап 5 — фронт-фундамент `client/`

1. `cd project/client && npm create vite@latest . -- --template react-ts`.
2. Установить: `react-router-dom zustand @tanstack/react-query chart.js react-chartjs-2`.
3. `vite.config.ts`:
   ```ts
   server: { proxy: { '/api': 'http://localhost:4000' } }
   ```
4. Скелет `src/`:
   - `main.tsx` — `<QueryClientProvider><RouterProvider /></QueryClientProvider>`
   - `router.tsx` — конфигурация из раздела «Раскладка кода»
   - `store/auth.ts` — `useAuthStore` (раздел «Контрактные решения»)
   - `store/ui.ts` — `useUiStore` с `selectedPeriod`
   - `api/client.ts` — `apiFetch<T>` + `ApiError` (раздел «Контрактные решения»)
   - `api/auth.ts`, `api/categories.ts`, `api/transactions.ts`, `api/reports.ts` — функции-обёртки
   - `hooks/` — `useCategories`, `useCreateCategory`, `useTransactions`, `useCreateTransaction`, `useReports*`
   - `components/RequireAuth.tsx` — гард по `useAuthStore.token`
   - `components/AppShell/` — **боковая** навигация ([product.md:365](../product.md#L365)) + контент-зона
   - `styles/global.css` — CSS-переменные палитры (нейтральные тона + два акцента: расходы/сбережения)
   - `lib/format.ts` — `formatRub(value)`, `formatDate(iso)`

**Выход этапа:** дев-сервер поднимается, любой защищённый роут редиректит на `/login`.

### Этап 6 — auth UI

1. `pages/LoginPage` — форма (`useState`), `useMutation` поверх `apiFetch('/auth/login', POST)`, `onSuccess` → `setSession + navigate('/')`. Errors отрисовываются через общий `<FormError>`.
2. `pages/RegisterPage` — форма; `onSuccess` сразу делает второй запрос login для автологина → `setSession + navigate('/')` ([chapters/02_chapter_2.md:624](../chapters/02_chapter_2.md#L624)).
3. Ссылки между страницами внизу формы.

**Ручная проверка:** регистрация → автоматический вход → дашборд (пока пустая заглушка, но без ошибок).

### Этап 7 — categories UI

`pages/CategoriesPage` ([chapters/02_chapter_2.md:660](../chapters/02_chapter_2.md#L660)):

- две колонки: expense слева, saving справа
- список + inline-кнопка «Добавить»; inline-редактирование name; «Удалить» с подтверждением
- мутации создания/переименования/удаления; invalidate `['categories']`
- ошибки от сервера показываются у соответствующих полей: `409 CATEGORY_DUPLICATE` рядом с input; `422 CATEGORY_HAS_TRANSACTIONS` — toast с ссылкой на журнал, отфильтрованный по этой категории

### Этап 8 — transactions UI

1. `pages/JournalPage` ([chapters/02_chapter_2.md:640](../chapters/02_chapter_2.md#L640)):
   - таблица: дата, тип, категория, сумма, комментарий, действия
   - панель фильтров (type, dateFrom, dateTo, categoryId)
   - пагинация: кнопки «Предыдущая/Следующая» + «Страница X из Y» = `Math.ceil(total/limit)`
   - `useTransactions(filter)` с `keepPreviousData: true`
   - удаление с подтверждением → invalidate `['transactions']` + `['reports']`
2. `pages/TransactionFormPage` ([chapters/02_chapter_2.md:650](../chapters/02_chapter_2.md#L650)) с пропсом `mode: 'create' | 'edit'`:
   - radio для type, numeric для amount (`step="0.01"`), `<input type="date">` для date, select категорий с фильтром по выбранному type, textarea для comment
   - `useCategories({ type })` обновляется при смене radio (TanStack Query кэширует)
   - submit → `useCreateTransaction()` / `useUpdateTransaction()`; ошибки 422 показываются под полем через `<FieldError name="amount" error={apiError} />`

### Этап 9 — dashboard

`pages/DashboardPage`:

- сверху: переключатель периода (3 вкладки), синхронизирован с `useUiStore.selectedPeriod`
- ниже: две карточки итогов (форматирование через `formatRub`)
- общий тоггл «расходы / сбережения»
- две диаграммы под тогглом: круговая `Doughnut` (`react-chartjs-2`) + линейный график
- одно изменение периода в сторе перерисовывает все три отчёта благодаря TanStack Query

Конфигурации Chart.js — точно как в фрагменте 2.18 ([chapters/02_chapter_2.md:693](../chapters/02_chapter_2.md#L693)).

### Этап 10 — полировка и seed

1. `server/scripts/seed.ts` ([chapters/03_chapter_3.md:340](../chapters/03_chapter_3.md#L340)):
   - 1 user (`demo@example.com` / `demo12345`)
   - 1000 операций расходов за 12 месяцев, равномерно по 7 категориям, суммы 100–5000 ₽
   - идемпотентность: если user существует — выйти без действий
2. `client/tests/`:
   - LoginPage submit + error 401 (1 тест)
   - TransactionFormPage submit + error 422 на поле (1 тест)
   - DashboardPage переключение периода → 3 запроса отправлены (1 тест)
   - RequireAuth без токена → редирект на /login (1 тест)
3. `npm run build` обоих сервисов; `npm run preview` фронта — проверить, что прод-сборка работает.
4. Дополнить `client/.env.example` и `server/.env.example` всеми переменными.

### Этап 11 — deploy-примеры

1. `deploy/nginx.conf.example` — точно из [chapters/03_chapter_3.md:309](../chapters/03_chapter_3.md#L309).
2. `deploy/systemd/backend.service.example` — простой юнит:

   ```ini
   [Unit]
   Description=Personal Finance Backend
   After=network.target postgresql.service

   [Service]
   Type=simple
   WorkingDirectory=/var/www/finance/server
   EnvironmentFile=/etc/finance/backend.env
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   RestartSec=5
   User=app

   [Install]
   WantedBy=multi-user.target
   ```

3. Дополнить `deploy/README.md` инструкцией выкатки (уже черновик есть).

## Тесты

- **Backend.** Vitest + Supertest, отдельная `DATABASE_URL` в `.env.test`. Между тестами — `TRUNCATE users, categories, transactions CASCADE`. Helper `registerAndLogin` для подготовки токена в каждом наборе. Каждый этап (1–4) **обязательно** завершается зелёным `npm test` в server.
- **Frontend.** 4 точечных теста на этапе 10 (см. выше). E2E (Playwright/Cypress) **не** вводим — [product.md:426](../product.md#L426).
- **Unit для бэка.** Только `period.ts` (вычисление границ периода) — остальное проверяется интеграционно.

## Production

См. [deploy/README.md](deploy/README.md). Состав окружения — [product.md:459](../product.md#L459) + [chapters/03_chapter_3.md:252](../chapters/03_chapter_3.md#L252).
