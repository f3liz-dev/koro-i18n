import { Hono } from "hono";
import { db } from "../db/database.js";

export const syncRouter = new Hono();

// Import translation files from a repository
// Accepts JSON files keyed by translation key, with optional author metadata
// Handles mixed sources: entries may come from Crowdin, GitHub, or manual edits
syncRouter.post("/:id/sync/import", async (c) => {
  const projectId = c.req.param("id");
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json();
  const { locale, entries, source, author_name, author_email, file_path } = body;

  if (!locale || typeof locale !== "string") {
    return c.json({ error: "locale is required" }, 400);
  }
  if (!entries || typeof entries !== "object") {
    return c.json({ error: "entries must be an object of { key: value }" }, 400);
  }

  const translationSource = source || "import";
  const defaultAuthor = author_name || "";
  const defaultEmail = author_email || "";

  const upsertKey = db.prepare(`
    INSERT INTO source_keys (project_id, key, file_path, default_value, updated_at)
    VALUES (?, ?, ?, '', datetime('now'))
    ON CONFLICT(project_id, key) DO UPDATE SET
      file_path = CASE WHEN excluded.file_path != '' THEN excluded.file_path ELSE source_keys.file_path END,
      updated_at = datetime('now')
  `);

  const findKey = db.prepare("SELECT id FROM source_keys WHERE project_id = ? AND key = ?");

  const upsertTranslation = db.prepare(`
    INSERT INTO translations (project_id, key_id, locale, value, status, author_name, author_email, source, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, datetime('now'))
    ON CONFLICT(key_id, locale) DO UPDATE SET
      value = excluded.value,
      author_name = CASE WHEN excluded.author_name != '' THEN excluded.author_name ELSE translations.author_name END,
      author_email = CASE WHEN excluded.author_email != '' THEN excluded.author_email ELSE translations.author_email END,
      source = excluded.source,
      updated_at = datetime('now')
  `);

  const importAll = db.transaction(() => {
    let imported = 0;
    let keys_created = 0;

    for (const [key, value] of Object.entries(entries)) {
      // Ensure key exists
      const existing = findKey.get(projectId, key);
      if (!existing) {
        upsertKey.run(projectId, key, file_path || "");
        keys_created++;
      }

      const keyRow = findKey.get(projectId, key);
      upsertTranslation.run(
        projectId,
        keyRow.id,
        locale,
        String(value),
        defaultAuthor,
        defaultEmail,
        translationSource
      );
      imported++;
    }

    return { imported, keys_created };
  });

  const result = importAll();
  return c.json(result, 200);
});

// Export translations for a locale, formatted for writing to repository files
// Includes Co-authored-by trailers for git credit
syncRouter.get("/:id/sync/export/:locale", (c) => {
  const projectId = c.req.param("id");
  const locale = c.req.param("locale");
  const statusFilter = c.req.query("status"); // optional: "approved" to export only approved

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  let query = `
    SELECT sk.key, t.value, t.status, t.author_name, t.author_email, t.source, sk.file_path
    FROM translations t
    JOIN source_keys sk ON t.key_id = sk.id
    WHERE t.project_id = ? AND t.locale = ?
  `;
  const params = [projectId, locale];

  if (statusFilter) {
    query += " AND t.status = ?";
    params.push(statusFilter);
  }
  query += " ORDER BY sk.key";

  const rows = db.prepare(query).all(...params);

  // Build the translation file content
  const translations = {};
  for (const row of rows) {
    translations[row.key] = row.value;
  }

  // Collect unique contributors for Co-authored-by git trailers
  const contributorSet = new Map();
  for (const row of rows) {
    if (row.author_name && row.author_email) {
      contributorSet.set(row.author_email, {
        name: row.author_name,
        email: row.author_email,
      });
    }
  }
  const coauthors = Array.from(contributorSet.values()).map(
    (a) => `Co-authored-by: ${a.name} <${a.email}>`
  );

  return c.json({
    locale,
    translations,
    coauthors,
    count: rows.length,
  });
});

// Get contributors for a project (for credit display)
syncRouter.get("/:id/sync/contributors", (c) => {
  const projectId = c.req.param("id");

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const contributors = db
    .prepare(
      `SELECT author_name, author_email, source,
              COUNT(*) as translation_count,
              COUNT(DISTINCT locale) as locale_count
       FROM translations
       WHERE project_id = ? AND author_name != ''
       GROUP BY author_name, author_email
       ORDER BY translation_count DESC`
    )
    .all(projectId);

  return c.json(contributors);
});
