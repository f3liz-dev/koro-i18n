import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { projectsRouter } from "./routes/projects.js";
import { translationsRouter } from "./routes/translations.js";
import { keysRouter } from "./routes/keys.js";
import { syncRouter } from "./routes/sync.js";

export const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api/projects", projectsRouter);
app.route("/api/projects", keysRouter);
app.route("/api/projects", translationsRouter);
app.route("/api/projects", syncRouter);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal server error" }, 500);
});
