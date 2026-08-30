import 'dotenv/config';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { Pool } from 'pg';
import { createToken, hashPassword, isValidEmail, normalizeEmail, readToken, verifyPassword } from './lib/auth.js';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required; copy .env.example to .env.`);

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim());
app.use(cors({ origin: origins, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));

const userView = (row) => ({ id: row.id, email: row.email, createdAt: row.created_at });
const authenticate = async (req, res, next) => {
  const payload = readToken(req.headers.authorization?.replace(/^Bearer\s+/i, ''), process.env.JWT_SECRET);
  if (!payload) return res.status(401).json({ error: 'Требуется авторизация.' });
  const { rows } = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) return res.status(401).json({ error: 'Пользователь не найден.' });
  req.user = rows[0];
  next();
};

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch (error) { next(error); }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Введите корректный email.' });
    if (password.length < 8) return res.status(400).json({ error: 'Пароль должен содержать не менее 8 символов.' });
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, created_at',
      [id, email, await hashPassword(password)]
    );
    res.status(201).json({ token: createToken(id, process.env.JWT_SECRET), user: userView(rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Этот email уже зарегистрирован.' });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { rows } = await pool.query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [email]);
    if (!rows[0] || !await verifyPassword(String(req.body.password || ''), rows[0].password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }
    res.json({ token: createToken(rows[0].id, process.env.JWT_SECRET), user: userView(rows[0]) });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: userView(req.user) }));

app.get('/api/vocabulary', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT word_id AS "wordId", word, level, part_of_speech AS "partOfSpeech", russian, disambiguation_hint AS "disambiguationHint", EXTRACT(EPOCH FROM added_at) * 1000 AS "addedAt", tests_count AS "testsCount", correct_count AS "correctCount", EXTRACT(EPOCH FROM last_tested_at) * 1000 AS "lastTestedAt" FROM user_vocabulary WHERE user_id = $1 ORDER BY added_at DESC', [req.user.id]);
    res.json({ items: rows.map(row => ({ ...row, addedAt: Number(row.addedAt), lastTestedAt: row.lastTestedAt ? Number(row.lastTestedAt) : undefined })) });
  } catch (error) { next(error); }
});

app.put('/api/vocabulary', authenticate, async (req, res, next) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length > 10000) return res.status(400).json({ error: 'Некорректный словарь.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_vocabulary WHERE user_id = $1', [req.user.id]);
    for (const item of items) {
      if (!item || typeof item.word !== 'string' || !['A1','A2','B1','B2','C1','C2'].includes(item.level)) throw new Error('Некорректное слово.');
      await client.query('INSERT INTO user_vocabulary (user_id, word_id, word, level, part_of_speech, russian, disambiguation_hint, added_at, tests_count, correct_count, last_tested_at) VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8 / 1000.0),$9,$10,CASE WHEN $11::bigint IS NULL THEN NULL ELSE to_timestamp($11 / 1000.0) END)', [req.user.id, String(item.wordId || item.word), item.word.trim(), item.level, String(item.partOfSpeech || ''), String(item.russian || ''), item.disambiguationHint || null, Number(item.addedAt || Date.now()), Math.max(0, Number(item.testsCount || 0)), Math.max(0, Math.min(Number(item.correctCount || 0), Number(item.testsCount || 0))), item.lastTestedAt ? Number(item.lastTestedAt) : null]);
    }
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.post('/api/test-history', authenticate, async (req, res, next) => {
  const results = req.body.results;
  if (!Array.isArray(results) || results.length > 500) return res.status(400).json({ error: 'Некорректные результаты теста.' });
  const client = await pool.connect();
  try {
    const id = crypto.randomUUID();
    const correct = results.filter(item => item.isCorrect).length;
    await client.query('BEGIN');
    await client.query('INSERT INTO test_attempts (id, user_id, mode, total_questions, correct_answers) VALUES ($1,$2,$3,$4,$5)', [id, req.user.id, String(req.body.mode || 'unknown'), results.length, correct]);
    for (const result of results) await client.query('INSERT INTO test_answers (id, attempt_id, word, user_answer, is_correct, time_taken_ms) VALUES ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), id, String(result.word || ''), String(result.userAnswer || ''), Boolean(result.isCorrect), Math.max(0, Number(result.timeTakenMs || 0))]);
    await client.query('COMMIT');
    res.status(201).json({ id });
  } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

if (!process.env.VERCEL) {
  const server = app.listen(process.env.PORT || 3001, () => console.log(`VocabMaster API listens on :${process.env.PORT || 3001}`));
  const shutdown = async () => { server.close(); await pool.end(); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}

export default app;
