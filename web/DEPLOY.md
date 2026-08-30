# Развёртывание VocabMaster Web

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
