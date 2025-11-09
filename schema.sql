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

-- Project source files (uploaded by client)
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  branch TEXT NOT NULL,
  commitSha TEXT NOT NULL,
  filename TEXT NOT NULL,
  filetype TEXT NOT NULL,
  lang TEXT NOT NULL,
  contents TEXT NOT NULL, -- JSON string of flattened key-value pairs
  metadata TEXT, -- JSON string of file metadata
  uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(projectId, branch, filename, lang)
);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(projectId, branch);
CREATE INDEX IF NOT EXISTS idx_project_files_lang ON project_files(projectId, lang);

-- Translations table (pending translations to be batched and committed)
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  language TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  userId TEXT NOT NULL,
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
  action TEXT NOT NULL, -- submitted, approved, rejected, deleted, committed
  commitSha TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (translationId) REFERENCES translations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_translation ON translation_history(translationId);
CREATE INDEX IF NOT EXISTS idx_history_key ON translation_history(projectId, language, key);
CREATE INDEX IF NOT EXISTS idx_history_created ON translation_history(createdAt);

-- Projects (Cloudflare-style: simple name + repository binding)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, -- UUID
  userId TEXT NOT NULL, -- Project owner
  name TEXT UNIQUE NOT NULL, -- Project name (globally unique, used in API)
  repository TEXT UNIQUE NOT NULL, -- GitHub repository (globally unique, owner/repo)
  accessControl TEXT DEFAULT 'whitelist', -- 'whitelist' or 'blacklist'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(userId);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_repo ON projects(repository);

-- Project members (users who have access to a project)
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  userId TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  role TEXT DEFAULT 'member', -- 'owner', 'member'
  addedBy TEXT, -- userId who added/invited this member
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addedBy) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(projectId, userId)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(projectId);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(userId);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(projectId, status);
