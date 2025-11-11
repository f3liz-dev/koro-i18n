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
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filetype" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "contents" TEXT NOT NULL,
    "metadata" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "commitSha" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Translation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "translationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "commitSha" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TranslationHistory_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "accessControl" TEXT NOT NULL DEFAULT 'whitelist',
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
CREATE INDEX "ProjectFile_projectId_branch_idx" ON "ProjectFile"("projectId", "branch");

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_lang_idx" ON "ProjectFile"("projectId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_projectId_branch_filename_lang_key" ON "ProjectFile"("projectId", "branch", "filename", "lang");

-- CreateIndex
CREATE INDEX "Translation_projectId_language_idx" ON "Translation"("projectId", "language");

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- CreateIndex
CREATE INDEX "Translation_projectId_language_key_idx" ON "Translation"("projectId", "language", "key");

-- CreateIndex
CREATE INDEX "Translation_createdAt_idx" ON "Translation"("createdAt");

-- CreateIndex
CREATE INDEX "TranslationHistory_translationId_idx" ON "TranslationHistory"("translationId");

-- CreateIndex
CREATE INDEX "TranslationHistory_projectId_language_key_idx" ON "TranslationHistory"("projectId", "language", "key");

-- CreateIndex
CREATE INDEX "TranslationHistory_createdAt_idx" ON "TranslationHistory"("createdAt");

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
