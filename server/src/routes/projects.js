import { Hono } from "hono";
import { db } from "../db/database.js";

export const projectsRouter = new Hono();

// List all projects
projectsRouter.get("/", (c) => {
  const projects = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM source_keys WHERE project_id = p.id) as key_count,
              (SELECT COUNT(DISTINCT locale) FROM translations WHERE project_id = p.id) as locale_count
       FROM projects p
       ORDER BY p.updated_at DESC`
    )
    .all();
  return c.json(projects);
});

// Create a project
projectsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { name, description, source_locale, repo_url } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return c.json({ error: "Project name is required" }, 400);
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO projects (name, description, source_locale, repo_url) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(
      name.trim(),
      description || "",
      source_locale || "en",
      repo_url || ""
    );
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
    return c.json(project, 201);
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ error: "Project with this name already exists" }, 409);
    }
    throw err;
  }
});

// Get a single project
projectsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const keyCount = db
    .prepare("SELECT COUNT(*) as count FROM source_keys WHERE project_id = ?")
    .get(id);
  const locales = db
    .prepare("SELECT DISTINCT locale FROM translations WHERE project_id = ?")
    .all(id)
    .map((r) => r.locale);

  const contributors = db
    .prepare(
      `SELECT DISTINCT author_name, author_email, source
       FROM translations
       WHERE project_id = ? AND author_name != ''
       ORDER BY author_name`
    )
    .all(id);

  return c.json({ ...project, key_count: keyCount.count, locales, contributors });
});

// Delete a project
projectsRouter.delete("/:id", (c) => {
  const id = c.req.param("id");
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);

  if (result.changes === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ deleted: true });
});
