CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_vocabulary (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL,
  level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  part_of_speech TEXT NOT NULL DEFAULT '',
  russian TEXT NOT NULL,
  disambiguation_hint TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tests_count INTEGER NOT NULL DEFAULT 0 CHECK (tests_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= tests_count),
  last_tested_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, word)
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(32) NOT NULL,
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0 AND correct_answers <= total_questions),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_answers (
  id UUID PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  user_answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_taken_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user_added ON user_vocabulary(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_completed ON test_attempts(user_id, completed_at DESC);
