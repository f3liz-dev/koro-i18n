import { Hono } from "hono";
import { db } from "../db/database.js";

export const translationsRouter = new Hono();

// Get translations for a project and locale
translationsRouter.get("/:id/translations/:locale", (c) => {
  const projectId = c.req.param("id");
  const locale = c.req.param("locale");

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const translations = db
    .prepare(
      `SELECT t.id, t.locale, t.value, t.status, t.author_name, t.author_email,
              t.source, t.created_at, t.updated_at,
              sk.key, sk.default_value, sk.context
       FROM translations t
       JOIN source_keys sk ON t.key_id = sk.id
       WHERE t.project_id = ? AND t.locale = ?
       ORDER BY sk.key`
    )
    .all(projectId, locale);

  return c.json(translations);
});

// Update translations for a project and locale (batch upsert)
// Supports author_name, author_email, source fields for credit tracking
translationsRouter.put("/:id/translations/:locale", async (c) => {
  const projectId = c.req.param("id");
  const locale = c.req.param("locale");

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json();
  const { translations, author_name, author_email, source } = body;

  if (!Array.isArray(translations)) {
    return c.json({ error: "translations must be an array of { key, value }" }, 400);
  }

  const findKey = db.prepare("SELECT id FROM source_keys WHERE project_id = ? AND key = ?");

  const upsert = db.prepare(`
    INSERT INTO translations (project_id, key_id, locale, value, status, author_name, author_email, source, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, datetime('now'))
    ON CONFLICT(key_id, locale) DO UPDATE SET
      value = excluded.value,
      author_name = CASE WHEN excluded.author_name != '' THEN excluded.author_name ELSE translations.author_name END,
      author_email = CASE WHEN excluded.author_email != '' THEN excluded.author_email ELSE translations.author_email END,
      source = excluded.source,
      updated_at = datetime('now')
  `);

  const authorName = author_name || "";
  const authorEmail = author_email || "";
  const translationSource = source || "platform";

  const updateMany = db.transaction((items) => {
    let updated = 0;
    let skipped = 0;
    for (const item of items) {
      const keyRow = findKey.get(projectId, item.key);
      if (!keyRow) {
        skipped++;
        continue;
      }
      upsert.run(
        projectId,
        keyRow.id,
        locale,
        item.value || "",
        item.author_name || authorName,
        item.author_email || authorEmail,
        item.source || translationSource
      );
      updated++;
    }
    return { updated, skipped };
  });

  const result = updateMany(translations);
  return c.json(result, 200);
});

// Get translation status overview for a project
translationsRouter.get("/:id/translations", (c) => {
  const projectId = c.req.param("id");

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const totalKeys = db
    .prepare("SELECT COUNT(*) as count FROM source_keys WHERE project_id = ?")
    .get(projectId);

  const localeStats = db
    .prepare(
      `SELECT locale,
              COUNT(*) as translated,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
       FROM translations
       WHERE project_id = ?
       GROUP BY locale`
    )
    .all(projectId);

  return c.json({
    total_keys: totalKeys.count,
    locales: localeStats,
  });
});
