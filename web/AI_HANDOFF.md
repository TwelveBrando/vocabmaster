# VocabMaster: передача контекста следующему ассистенту

## Цель и архитектура

Это React/Vite приложение словаря. Десктопная Electron-версия должна продолжать работать. Веб-версия использует тот же `src/` и состоит из:

```text
Browser → Vercel frontend → Vercel Express API → Neon PostgreSQL
```

- Репозиторий: `https://github.com/TwelveBrando/vocabmaster`
- Production frontend: `https://vocabmaster-lac-nine.vercel.app`
- Production API: `https://vocabmaster-api-pi.vercel.app`
- API health: `https://vocabmaster-api-pi.vercel.app/api/health`

## Vercel projects

### Frontend project: `vocabmaster`

- Root Directory: repository root.
- Build command: `npx vite build --config web/client/vite.config.ts`.
- Output directory: `web/client/dist`.
- Environment variable `VITE_API_URL` is **Config**, not Secret, and equals `https://vocabmaster-api-pi.vercel.app/api`.
- It is embedded during build, so redeploy frontend after changing it.

### API project: `vocabmaster-api`

- Root Directory: `web`.
- Vercel entrypoint: `web/api/index.js`; it exports Express app from `web/server.js`.
- `web/vercel.json` rewrites `/api/*` to the function.
- Required environment variables:
  - `DATABASE_URL`: Neon pooled PostgreSQL URL, **Secret**.
  - `JWT_SECRET`: long random value, **Secret**.
  - `NODE_ENV=production`.
  - `CLIENT_ORIGIN=https://vocabmaster-lac-nine.vercel.app`.
- If frontend domain changes, update `CLIENT_ORIGIN` and redeploy the API. A CORS error means this origin is wrong.

Never put secrets, `.env`, database URLs, or JWT values into GitHub or frontend variables.

## Database and auth

- Neon PostgreSQL holds `users`, `user_vocabulary`, `test_attempts`, and `test_answers`.
- Initial schema: `web/db/migrations/001_initial.sql`.
- Apply local migration with `cd web; npm.cmd run migrate`. On this Windows PowerShell host use `npm.cmd`, because `npm.ps1` can be blocked by ExecutionPolicy.
- `web/.env` is gitignored and contains local `DATABASE_URL`.
- Current migration script runs only `001_initial.sql`. If adding a schema migration, update `web/scripts/migrate.js` to execute it safely and make SQL idempotent where possible before deployment.
- Auth uses scrypt password hashes and signed JWTs. Token is kept in browser localStorage (`vocabmaster_web_token`).

## Main code locations

- Frontend app: `src/App.tsx`.
- Cloud API client: `src/services/cloudSyncService.ts`.
- Vocabulary sync: `src/services/vocabularyService.ts`.
- Profile/history UI: `src/components/ProfileScreen.tsx`.
- API: `web/server.js`.
- Authentication helpers: `web/lib/auth.js`.
- API tests: `web/test/auth.test.js`.

The grammar exercise feature is intentionally disabled. Do not re-enable `GrammarExerciseScreen` or its AI calls unless explicitly requested.

## Normal change and deployment process

1. Preserve the desktop Electron behavior; web-specific changes should not break it.
2. Make changes locally and run:

   ```powershell
   npm run build
   cd web
   npm.cmd test
   ```

3. For normal frontend/API changes:

   ```powershell
   cd C:\TestVocabulary
   git add .
   git commit -m "Describe the change"
   git push
   ```

4. Pushes to `main` automatically trigger Vercel deployments for both projects. Wait for both to report **Ready** and test the public site.
5. For larger or risky changes, create a feature branch and use Vercel Preview before merging into `main`.
6. For DB changes: apply migration against the same Neon `DATABASE_URL` used in Vercel API, then deploy backward-compatible API/frontend code. Never guess or expose the connection string.

## Existing behavior

- Register/login works with PostgreSQL.
- Vocabulary is synced when authenticated.
- Completed test results are saved in `test_attempts`/`test_answers`.
- Profile shows the latest 20 test attempts through `GET /api/test-history`.
- AI provider keys intentionally stay in the user's browser; do not persist them to shared DB.
