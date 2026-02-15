import { Hono } from "hono";
import { db } from "../db/database.js";

export const keysRouter = new Hono();

// List source keys for a project
keysRouter.get("/:id/keys", (c) => {
  const projectId = c.req.param("id");
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const keys = db
    .prepare("SELECT * FROM source_keys WHERE project_id = ? ORDER BY key")
    .all(projectId);
  return c.json(keys);
});

// Push source keys (batch upsert)
keysRouter.post("/:id/keys", async (c) => {
  const projectId = c.req.param("id");
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json();
  const { keys } = body;

  if (!Array.isArray(keys)) {
    return c.json({ error: "keys must be an array" }, 400);
  }

  const upsert = db.prepare(`
    INSERT INTO source_keys (project_id, key, file_path, default_value, context, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(project_id, key) DO UPDATE SET
      file_path = CASE WHEN excluded.file_path != '' THEN excluded.file_path ELSE source_keys.file_path END,
      default_value = excluded.default_value,
      context = excluded.context,
      updated_at = datetime('now')
  `);

  const insertMany = db.transaction((items) => {
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      const existing = db
        .prepare("SELECT id FROM source_keys WHERE project_id = ? AND key = ?")
        .get(projectId, item.key);
      upsert.run(
        projectId,
        item.key,
        item.file_path || "",
        item.default_value || "",
        item.context || ""
      );
      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }
    return { inserted, updated };
  });

  const result = insertMany(keys);
  return c.json({ ...result, total: keys.length }, 200);
});
