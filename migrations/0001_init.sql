-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OauthState" (
    "state" TEXT NOT NULL PRIMARY KEY,
    "timestamp" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "R2File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "totalKeys" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WebTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceHash" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebTranslation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebTranslationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "translationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "sourceHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebTranslationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebTranslationHistory_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "WebTranslation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "accessControl" TEXT NOT NULL DEFAULT 'whitelist',
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "role" TEXT NOT NULL DEFAULT 'member',
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE INDEX "User_githubId_idx" ON "User"("githubId");

-- CreateIndex
CREATE INDEX "OauthState_expiresAt_idx" ON "OauthState"("expiresAt");

-- CreateIndex
CREATE INDEX "R2File_projectId_branch_idx" ON "R2File"("projectId", "branch");

-- CreateIndex
CREATE INDEX "R2File_projectId_lang_idx" ON "R2File"("projectId", "lang");

-- CreateIndex
CREATE INDEX "R2File_lastUpdated_idx" ON "R2File"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "R2File_projectId_branch_lang_filename_key" ON "R2File"("projectId", "branch", "lang", "filename");

-- CreateIndex
CREATE INDEX "WebTranslation_projectId_language_filename_idx" ON "WebTranslation"("projectId", "language", "filename");

-- CreateIndex
CREATE INDEX "WebTranslation_status_idx" ON "WebTranslation"("status");

-- CreateIndex
CREATE INDEX "WebTranslation_projectId_language_filename_key_idx" ON "WebTranslation"("projectId", "language", "filename", "key");

-- CreateIndex
CREATE INDEX "WebTranslation_updatedAt_idx" ON "WebTranslation"("updatedAt");

-- CreateIndex
CREATE INDEX "WebTranslation_isValid_idx" ON "WebTranslation"("isValid");

-- CreateIndex
CREATE INDEX "WebTranslationHistory_translationId_idx" ON "WebTranslationHistory"("translationId");

-- CreateIndex
CREATE INDEX "WebTranslationHistory_projectId_language_filename_key_idx" ON "WebTranslationHistory"("projectId", "language", "filename", "key");

-- CreateIndex
CREATE INDEX "WebTranslationHistory_createdAt_idx" ON "WebTranslationHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_repository_key" ON "Project"("repository");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_repository_idx" ON "Project"("repository");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_status_idx" ON "ProjectMember"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
