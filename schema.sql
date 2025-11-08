-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  githubId INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatarUrl TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth states table (temporary, auto-expire, in-memory only for stateless JWT)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  expiresAt DATETIME NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_githubId ON users(githubId);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expiresAt ON oauth_states(expiresAt);

-- Translations table (pending translations to be batched and committed)
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  language TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, committed, rejected, deleted
  commitSha TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_translations_project ON translations(projectId, language);
CREATE INDEX IF NOT EXISTS idx_translations_status ON translations(status);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(projectId, language, key);
CREATE INDEX IF NOT EXISTS idx_translations_created ON translations(createdAt);

-- Translation history log (audit trail for each translation key)
CREATE TABLE IF NOT EXISTS translation_history (
  id TEXT PRIMARY KEY,
  translationId TEXT NOT NULL,
  projectId TEXT NOT NULL,
  language TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL, -- submitted, approved, rejected, deleted, committed
  commitSha TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (translationId) REFERENCES translations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_translation ON translation_history(translationId);
CREATE INDEX IF NOT EXISTS idx_history_key ON translation_history(projectId, language, key);
CREATE INDEX IF NOT EXISTS idx_history_created ON translation_history(createdAt);
