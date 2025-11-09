-- Add accessControl column to projects table
ALTER TABLE projects ADD COLUMN accessControl TEXT DEFAULT 'whitelist';

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  userId TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  role TEXT DEFAULT 'member',
  addedBy TEXT,
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
