# client

Frontend: Vite + React + TypeScript + React Router + Zustand + TanStack Query + Chart.js + CSS Modules. Стек и зоны ответственности - [../../product.md#L206](../../product.md#L206).

## Структура

```
client/
  index.html
  vite.config.ts        прокси /api -> http://localhost:3000 на dev
  public/
  src/
    main.tsx
    App.tsx
    router.tsx          React Router конфигурация
    api/                fetch-обёртки (по одному файлу на раздел REST API)
    hooks/              useQuery/useMutation хуки поверх TanStack Query
    store/              Zustand-сторы (auth, ui)
    pages/
      LoginPage/
      RegisterPage/
      DashboardPage/
      TransactionsPage/
      CategoriesPage/
    components/         переиспользуемые UI-компоненты (Button, Modal, ...)
    lib/                форматирование чисел/дат, утилиты
    styles/             глобальные стили и переменные
```

Каждая папка-страница содержит `Page.tsx` + `Page.module.css` + локальные подкомпоненты. Это допущение проекта; в `product.md` структура папок не зафиксирована.

## Скрипты (после `npm install`)

- `npm run dev` - Vite на `:5173` с прокси `/api -> :3000`
- `npm run build` - production-сборка в `dist/` (Nginx раздаёт её как статику, [product.md:463](../../product.md#L463))
- `npm run preview` - локальная проверка production-сборки
- `npm test` - точечные тесты ключевых форм через React Testing Library + Vitest

## Зачем нужны Zustand и TanStack Query одновременно

По [product.md:232](../../product.md#L232) - [product.md:234](../../product.md#L234): Zustand хранит небольшое клиентское состояние (auth-токен, UI-настройки), TanStack Query - серверные данные (категории, операции, отчёты) с встроенным кэшем и состояниями загрузки/ошибки. Разделение зон ответственности зафиксировано в спецификации.

## JWT

Хранится в `localStorage` по [product.md:404](../../product.md#L404). Чтение и запись инкапсулированы в Zustand auth-сторе - компоненты с `localStorage` напрямую не работают.
