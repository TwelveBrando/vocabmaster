# Развёртывание VocabMaster Web

## Вариант Vercel + Neon (рекомендуемый для облачного запуска)

На Vercel нужно создать **два проекта из одного GitHub-репозитория**: API и интерфейс. База остаётся отдельным облачным PostgreSQL.

1. В [Neon](https://neon.tech) создайте Project → Postgres, затем в **Connect** скопируйте connection string (с `sslmode=require`).
2. В Vercel нажмите **Add New → Project**, импортируйте репозиторий. Для первого проекта задайте **Root Directory: `web`**. Это API.
3. В API-проекте откройте Settings → Environment Variables и добавьте для Production и Preview: `DATABASE_URL` (строка Neon), `JWT_SECRET` (длинное случайное значение), `CLIENT_ORIGIN` (на первом этапе можно временно поставить `http://localhost:5173`) и `NODE_ENV=production`.
4. Deploy API. Запомните адрес, например `https://vocabmaster-api.vercel.app`. Откройте `https://.../api/health`.
5. Один раз примените миграцию локально, временно записав тот же Neon URL в `web/.env`: `cd web; npm run migrate`. Это создаст таблицы.
6. Создайте в Vercel второй проект с тем же репозиторием, но **Root Directory оставьте пустым**. Это интерфейс. В Build Command укажите `npx vite build --config web/client/vite.config.ts`, Output Directory — `web/client/dist`.
7. В переменных окружения второго проекта добавьте `VITE_API_URL=https://vocabmaster-api.vercel.app/api`. Deploy.
8. Скопируйте адрес интерфейса (например, `https://vocabmaster.vercel.app`) и замените `CLIENT_ORIGIN` в API-проекте на него. Повторно сделайте Deploy API.

Не добавляйте `DATABASE_URL` или `JWT_SECRET` в GitHub или во frontend-проект: эти секреты должны быть только в настройках API Vercel.

## 1. Локальная подготовка PostgreSQL

Создайте БД и пользователя в `psql`:

```sql
CREATE USER vocabmaster_app WITH PASSWORD 'replace-with-long-password';
CREATE DATABASE vocabmaster OWNER vocabmaster_app;
```

Скопируйте `web/.env.example` в `web/.env`, впишите пароль и случайный `JWT_SECRET`. Затем:

```powershell
cd web
npm install
npm run migrate
npm run dev
```

Сервер должен ответить `{"status":"ok"}` по `http://localhost:3001/api/health`.

## 2. Запуск интерфейса

В другом терминале из корня проекта:

```powershell
npm run dev:vite
```

Откройте `http://localhost:5173`, зарегистрируйтесь через кнопку «Войти». Словарь и завершённые тесты будут записываться в PostgreSQL. Настройки и ключи ИИ преднамеренно остаются только в браузере пользователя.

## 3. Публикация

1. Поднимите управляемый PostgreSQL (например, на Render, Railway, Neon или своём VPS), примените `npm run migrate` с его `DATABASE_URL`.
2. Разместите API как Node-сервис: `npm ci --omit=dev`, затем `npm start`. В `NODE_ENV=production` задайте `DATABASE_URL`, сильный `JWT_SECRET`, `CLIENT_ORIGIN=https://ваш-домен` и `PORT` от хостинга.
3. Соберите фронтенд из корня: `npm run build`. Папку `web/client/dist` раздайте как статический сайт (Nginx, Netlify, Cloudflare Pages). При сборке укажите `VITE_API_URL=https://api.ваш-домен/api`.
4. Подключите домены и HTTPS. На API разрешите CORS только для настоящего домена клиента. Не публикуйте `.env` и не храните там ключи ИИ пользователей.
5. После публикации проверьте регистрацию, повторный вход, добавление слова, завершение теста и перезагрузку страницы.

## Перед первым запуском

Нужны только два значения от вас: строка подключения `DATABASE_URL` к PostgreSQL и случайный `JWT_SECRET`. Не присылайте пароль в чат: внесите их в `web/.env` локально.
