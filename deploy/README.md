# deploy

Примеры production-конфигурации. Состав компонентов и обоснование - [../../product.md#L459](../../product.md#L459).

## Файлы

- [`nginx.conf.example`](nginx.conf.example) — reverse proxy: TLS, отдача статики из `client/dist`, проксирование `/api/*` на Node-процесс backend на `:4000`.
- [`systemd/backend.service.example`](systemd/backend.service.example) — юнит для запуска `node dist/index.js` с авто-рестартом.

Файлы публикуются как примеры (`.example`); реальные значения путей, доменов и секретов задаются на стороне сервера и не коммитятся.

## Порядок выкатки

1. `git pull` на сервере.
2. `cd server && npm ci && npm run build`.
3. `cd client && npm ci && npm run build` — артефакт в `client/dist`, который раздаёт Nginx.
4. `npx prisma migrate deploy` — применение миграций ([product.md:465](../../product.md#L465)).
5. `systemctl restart finance-backend` — перезапуск backend после миграций.
6. `nginx -t && systemctl reload nginx` — применение изменений конфигурации, если есть.

Это допущение проекта (порядок шагов); в `product.md` зафиксированы только сами компоненты, не последовательность.

## Минимально необходимые переменные backend в `/etc/finance/backend.env`

```env
DATABASE_URL=postgresql://app:secret@localhost:5432/finance
JWT_SECRET=замените-на-секрет-длиной-не-менее-64-байт
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=https://finance.example.com
```
