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

Grammar exercises are enabled at the user’s request. `GrammarExerciseScreen` uses `src/services/localGrammarGenerator.ts` and the authored rule/lexical bank in `src/data/grammarPracticeData.ts`. Do not reconnect the old external AI generator to this screen without an explicit request.

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
- When an AI key is configured, tests from the personal vocabulary bank now pass selected words through `AIService.fetchWordsData` before starting. This also enriches user-imported words with a Russian `disambiguationHint` and saves it back to local/cloud vocabulary.
- AI-generated context is marked with `contextSource: "ai"` and `contextVersion`. Old cache entries or bare translations such as `stairs — лестница` are regenerated once; useful current AI context is reused.
- Russian-to-English tests accept the selected English vocabulary item, not broad semantic synonyms: for a `stairs` question, `ladder` is intentionally incorrect. Context behavior has regression coverage in `npm run test:context`.
- Gemini calls send the API key in the `x-goog-api-key` header, never in the URL. Model discovery is dynamic; a `404` skips that model immediately, while transient `429`/`5xx` responses get one delayed retry before falling back to another supported model.
- AI word preparation is streamed in batches of 6. A test opens as soon as its first batch (or cached words) is ready, appends later questions without resetting answered results, and shows an in-test loaded/total progress bar. If the user reaches the temporary end, the test waits for the next batch instead of finishing early.
- Profile keeps one prominent `Тестировать мой словарь` action and a compact `Импорт` action. Context controls live inside the `Контекст загружен` metric card: `Загрузить` preloads the whole personal vocabulary, the prepared/total counter and progress bar show its state, and `Очистить` removes generated context/cache without deleting words, translations, or statistics. During loading, `Пауза` stops the queue after the current network request, `Продолжить` resumes it, and `Остановить` aborts the request and keeps every completed batch. The metric, bar, and loading label all use the actual prepared count, never the transient queue-attempt count.
- User-facing branding is `VocabMaster`; avoid `AI`/`ИИ` marketing labels in the site UI and document title. Internal type and service names may still use `AI` where technically useful.
- Non-authentication inputs must not be treated as browser credentials. Provider keys use text inputs masked with `-webkit-text-security`, `autocomplete="one-time-code"`, password-manager ignore attributes, and interaction guards; vocabulary search rejects delayed credential autofill. Keep normal `email`/`current-password` autocomplete only in `AuthModal`.
- Mobile tests expose explicit `Проверить ответ` and `Следующее слово`/`Завершить тест` actions; keyboard-only hints are hidden below the `sm` breakpoint. Mobile layout uses scale 1, safe-area padding, non-overflowing control grids, compact modal spacing, and no sticky hover transforms. Lightweight/coarse-pointer devices skip Lenis and render the liquid background at a lower resolution and speed.

## Grammar practice update (2026-09-05)

- Every one of the 25 A1 lectures links to three exercise types, seven questions each: multiple choice, fill-in, correction.
- Local generation makes no network calls and needs no provider key. The bank currently contains 3,892 grammatical variants; it is a finite rule-based generator, not a neural model or an unlimited source of human-authored sentences.
- The selector balances rule coverage, prevents repeated key vocabulary inside a 21-question set, excludes the last 21 scenes, and rotates older material. Function words and some shared sentence framing recur. History is local to this browser/device in vocab_grammar_local_history_v1, with an in-memory fallback when storage fails.
- After each block the learner may request seven more of the same type. This resets that block’s score and preserves the other blocks. After completion, repeat the same set or generate a new set of 21.
- Scores use the actual denominator (21 for local practice); old stored 15-question scores retain their denominator. Grammar progress remains local in vocab_grammar_progress_v2; this change does not add cloud grammar progress.
- The irregular-verb reference reuses the full existing VERBS table and accepts listed slash-separated variants in fill-in answers.
- npm.cmd run test:grammar runs both the legacy provider regressions and new local generation tests (25 lectures, 10,500 questions, diversity, storage, scores, single-block regeneration). Also run both builds, test:context and the web API tests.
- Browser smoke test: serve the built web/client/dist at http://127.0.0.1:5174 using Vite preview, then run npx.cmd electron scripts/check-grammar-ui.cjs. This uses a hidden Chromium window and an isolated test profile under node_modules/.tmp. It checks a complete quiz, single-block and full regeneration, score persistence and mobile width.
- Publishing is authorized by the user. Push to main uses the existing automatic Vercel deployments; verify frontend and API after the push.
- Local performance sample: 750 sets across all lectures, median 1.94 ms, p95 3.56 ms, max 7.82 ms on the development machine; bounded history was about 404 KB. These are development-machine measurements, not a guarantee for low-end phones. Generation runs only on demand and adds no API/database requests.
