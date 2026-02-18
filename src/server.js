require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto.createHash("sha256").update("local-dev-secret").digest("hex");

if (NODE_ENV === "production") {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD must be set and at least 12 characters in production.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters in production.");
  }
}

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "site.db");
const dataDir = path.dirname(dbPath);
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(dbPath);

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function tableHasColumn(columnName) {
  return db
    .prepare("PRAGMA table_info(projects)")
    .all()
    .some((column) => column.name === columnName);
}

function ensureColumn(columnName, definition) {
  if (!tableHasColumn(columnName)) {
    db.exec(`ALTER TABLE projects ADD COLUMN ${columnName} ${definition}`);
  }
}

function generateUniqueSlug(baseSlug, excludeId = null) {
  const normalizedBase = slugify(baseSlug) || "project";
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const existing = excludeId
      ? db.prepare("SELECT id FROM projects WHERE slug = ? AND id != ?").get(candidate, excludeId)
      : db.prepare("SELECT id FROM projects WHERE slug = ?").get(candidate);

    if (!existing) {
      return candidate;
    }

    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
}

function normalizeExistingSlugs() {
  const rows = db.prepare("SELECT id, title, slug FROM projects ORDER BY id ASC").all();
  const update = db.prepare("UPDATE projects SET slug = ? WHERE id = ?");

  const transaction = db.transaction(() => {
    for (const row of rows) {
      const base = row.slug || row.title || `project-${row.id}`;
      const uniqueSlug = generateUniqueSlug(base, row.id);
      update.run(uniqueSlug, row.id);
    }
  });

  transaction();
}

function runSchemaMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      project_type TEXT NOT NULL DEFAULT 'app',
      year INTEGER NOT NULL,
      icon TEXT NOT NULL DEFAULT '✦',
      icon_theme TEXT NOT NULL DEFAULT 'invoice',
      status TEXT NOT NULL DEFAULT 'published',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      gallery_json TEXT NOT NULL DEFAULT '[]',
      tech_stack_json TEXT NOT NULL DEFAULT '[]',
      demo_url TEXT NOT NULL DEFAULT '',
      repo_url TEXT NOT NULL DEFAULT '',
      download_url TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn("slug", "TEXT");
  ensureColumn("details", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("project_type", "TEXT NOT NULL DEFAULT 'app'");
  ensureColumn("status", "TEXT NOT NULL DEFAULT 'published'");
  ensureColumn("thumbnail_url", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("gallery_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("tech_stack_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("demo_url", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("repo_url", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("download_url", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("published_at", "TEXT");

  db.exec(`
    UPDATE projects SET
      details = COALESCE(NULLIF(details, ''), description),
      project_type = COALESCE(NULLIF(project_type, ''), 'app'),
      status = COALESCE(NULLIF(status, ''), 'published'),
      thumbnail_url = COALESCE(thumbnail_url, ''),
      gallery_json = COALESCE(NULLIF(gallery_json, ''), '[]'),
      tech_stack_json = COALESCE(NULLIF(tech_stack_json, ''), '[]'),
      demo_url = COALESCE(demo_url, ''),
      repo_url = COALESCE(repo_url, ''),
      download_url = COALESCE(download_url, '')
  `);

  normalizeExistingSlugs();
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug)");
}

runSchemaMigrations();

const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get().count;
if (projectCount === 0) {
  const seed = db.prepare(
    `INSERT INTO projects (
      slug, title, description, details, category, project_type, year, icon, icon_theme,
      status, thumbnail_url, gallery_json, tech_stack_json, demo_url, repo_url, download_url,
      is_featured, display_order, published_at
    ) VALUES (
      @slug, @title, @description, @details, @category, @project_type, @year, @icon, @icon_theme,
      @status, @thumbnail_url, @gallery_json, @tech_stack_json, @demo_url, @repo_url, @download_url,
      @is_featured, @display_order, @published_at
    )`
  );

  const transaction = db.transaction((rows) => {
    for (const row of rows) {
      seed.run(row);
    }
  });

  const now = new Date().toISOString();

  transaction([
    {
      slug: "simpleinvoice",
      title: "SimpleInvoice",
      description:
        "Billing software that does not require an accounting degree. Removed everything except the act of getting paid.",
      details:
        "SimpleInvoice is focused on one outcome: getting paid with less friction. Create branded invoices, send secure payment links, and see payment status instantly.",
      category: "Web App",
      project_type: "app",
      year: 2024,
      icon: "$",
      icon_theme: "invoice",
      status: "published",
      thumbnail_url: "",
      gallery_json: JSON.stringify([]),
      tech_stack_json: JSON.stringify(["Node.js", "Stripe", "SQLite"]),
      demo_url: "",
      repo_url: "",
      download_url: "",
      is_featured: 1,
      display_order: 1,
      published_at: now,
    },
    {
      slug: "calmcal",
      title: "CalmCal",
      description:
        "Scheduling without notification anxiety. Time management that respects attention.",
      details:
        "CalmCal helps teams create focused schedules and silent defaults. It is designed for attention-first planning with fewer interruptions.",
      category: "iOS",
      project_type: "app",
      year: 2024,
      icon: "◷",
      icon_theme: "calendar",
      status: "published",
      thumbnail_url: "",
      gallery_json: JSON.stringify([]),
      tech_stack_json: JSON.stringify(["SwiftUI", "CloudKit"]),
      demo_url: "",
      repo_url: "",
      download_url: "",
      is_featured: 0,
      display_order: 2,
      published_at: now,
    },
    {
      slug: "plainnotes",
      title: "PlainNotes",
      description:
        "Note-taking with no AI, no collaboration, no syntax. Just text.",
      details:
        "PlainNotes keeps capture and recall fast by removing formatting complexity. The project emphasizes speed, stability, and local-first behavior.",
      category: "macOS",
      project_type: "app",
      year: 2023,
      icon: "✎",
      icon_theme: "notes",
      status: "published",
      thumbnail_url: "",
      gallery_json: JSON.stringify([]),
      tech_stack_json: JSON.stringify(["Swift", "AppKit"]),
      demo_url: "",
      repo_url: "",
      download_url: "",
      is_featured: 0,
      display_order: 3,
      published_at: now,
    },
  ]);
}

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "256kb" }));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

function timingSafeEqualString(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function safeJsonArrayParse(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toPublicProject(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    details: row.details,
    category: row.category,
    projectType: row.project_type,
    year: row.year,
    icon: row.icon,
    iconTheme: row.icon_theme,
    status: row.status,
    thumbnailUrl: row.thumbnail_url,
    gallery: safeJsonArrayParse(row.gallery_json),
    techStack: safeJsonArrayParse(row.tech_stack_json),
    demoUrl: row.demo_url,
    repoUrl: row.repo_url,
    downloadUrl: row.download_url,
    featured: Boolean(row.is_featured),
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function isValidHttpUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseStringArray(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(/\n|,/) 
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function validateProjectInput(input, existingProject = null) {
  const errors = [];
  const iconThemes = new Set(["invoice", "calendar", "notes"]);
  const projectTypes = new Set(["website", "app", "tool"]);
  const statuses = new Set(["draft", "published"]);

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 80) {
    errors.push("title must be between 1 and 80 characters.");
  }

  const rawSlug = typeof input.slug === "string" ? input.slug.trim() : "";
  const slug = slugify(rawSlug || title);
  if (!slug || slug.length > 90) {
    errors.push("slug must be between 1 and 90 characters after normalization.");
  }

  if (slug) {
    const existing = existingProject
      ? db.prepare("SELECT id FROM projects WHERE slug = ? AND id != ?").get(slug, existingProject.id)
      : db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug);

    if (existing) {
      errors.push("slug already exists. Use a different slug.");
    }
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description || description.length > 300) {
    errors.push("description must be between 1 and 300 characters.");
  }

  const details = typeof input.details === "string" ? input.details.trim() : description;
  if (!details || details.length > 5000) {
    errors.push("details must be between 1 and 5000 characters.");
  }

  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!category || category.length > 30) {
    errors.push("category must be between 1 and 30 characters.");
  }

  const projectType = typeof input.projectType === "string" ? input.projectType.trim() : "app";
  if (!projectTypes.has(projectType)) {
    errors.push("projectType must be one of: website, app, tool.");
  }

  const status = typeof input.status === "string" ? input.status.trim() : "published";
  if (!statuses.has(status)) {
    errors.push("status must be one of: draft, published.");
  }

  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    errors.push("year must be a valid 4-digit year.");
  }

  const icon = typeof input.icon === "string" ? input.icon.trim() : "";
  if (!icon || icon.length > 2) {
    errors.push("icon must be 1 or 2 characters.");
  }

  const iconTheme = typeof input.iconTheme === "string" ? input.iconTheme.trim() : "invoice";
  if (!iconThemes.has(iconTheme)) {
    errors.push("iconTheme must be one of: invoice, calendar, notes.");
  }

  const featured = Boolean(input.featured);
  const displayOrder = Number(input.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) {
    errors.push("displayOrder must be an integer between 0 and 9999.");
  }

  const thumbnailUrl = typeof input.thumbnailUrl === "string" ? input.thumbnailUrl.trim() : "";
  const demoUrl = typeof input.demoUrl === "string" ? input.demoUrl.trim() : "";
  const repoUrl = typeof input.repoUrl === "string" ? input.repoUrl.trim() : "";
  const downloadUrl = typeof input.downloadUrl === "string" ? input.downloadUrl.trim() : "";

  if (!isValidHttpUrl(thumbnailUrl)) {
    errors.push("thumbnailUrl must be a valid http/https URL.");
  }
  if (!isValidHttpUrl(demoUrl)) {
    errors.push("demoUrl must be a valid http/https URL.");
  }
  if (!isValidHttpUrl(repoUrl)) {
    errors.push("repoUrl must be a valid http/https URL.");
  }
  if (!isValidHttpUrl(downloadUrl)) {
    errors.push("downloadUrl must be a valid http/https URL.");
  }

  const gallery = parseStringArray(input.gallery);
  if (gallery.length > 12) {
    errors.push("gallery supports up to 12 URLs.");
  }
  if (gallery.some((url) => !isValidHttpUrl(url))) {
    errors.push("gallery items must be valid http/https URLs.");
  }

  const techStack = parseStringArray(input.techStack);
  if (techStack.length > 20) {
    errors.push("techStack supports up to 20 items.");
  }
  if (techStack.some((item) => item.length > 40)) {
    errors.push("each techStack item must be at most 40 characters.");
  }

  const publishedAtInput =
    typeof input.publishedAt === "string" ? input.publishedAt.trim() : "";

  let publishedAt = null;
  if (status === "published") {
    if (publishedAtInput) {
      const parsed = new Date(publishedAtInput);
      if (Number.isNaN(parsed.getTime())) {
        errors.push("publishedAt must be a valid date/time.");
      } else {
        publishedAt = parsed.toISOString();
      }
    } else if (existingProject?.published_at) {
      publishedAt = existingProject.published_at;
    } else {
      publishedAt = new Date().toISOString();
    }
  }

  return {
    errors,
    value: {
      slug,
      title,
      description,
      details,
      category,
      projectType,
      status,
      year,
      icon,
      iconTheme,
      thumbnailUrl,
      gallery,
      techStack,
      demoUrl,
      repoUrl,
      downloadUrl,
      featured,
      displayOrder,
      publishedAt,
    },
  };
}

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/projects", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT *
       FROM projects
       WHERE status = 'published'
       ORDER BY is_featured DESC, display_order ASC, id DESC`
    )
    .all();

  res.json(rows.map(toPublicProject));
});

app.get("/api/projects/:slug", (req, res) => {
  const slug = slugify(req.params.slug);
  if (!slug) {
    return res.status(404).json({ error: "Project not found." });
  }

  const row = db
    .prepare(
      `SELECT *
       FROM projects
       WHERE slug = ? AND status = 'published'
       LIMIT 1`
    )
    .get(slug);

  if (!row) {
    return res.status(404).json({ error: "Project not found." });
  }

  return res.json(toPublicProject(row));
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  const userOk = timingSafeEqualString(username, ADMIN_USERNAME);
  const passOk = timingSafeEqualString(password, ADMIN_PASSWORD);

  if (!userOk || !passOk) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = jwt.sign({ sub: ADMIN_USERNAME, role: "admin" }, JWT_SECRET, {
    expiresIn: "8h",
    issuer: "signor-vale",
  });

  return res.json({ token, expiresIn: "8h" });
});

app.get("/api/admin/projects", authenticateAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT *
       FROM projects
       ORDER BY is_featured DESC, display_order ASC, id DESC`
    )
    .all();

  res.json(rows.map(toPublicProject));
});

app.post("/api/admin/projects", authenticateAdmin, (req, res) => {
  const { errors, value } = validateProjectInput(req.body || null, null);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const result = db
    .prepare(
      `INSERT INTO projects (
        slug, title, description, details, category, project_type, year, icon, icon_theme,
        status, thumbnail_url, gallery_json, tech_stack_json, demo_url, repo_url, download_url,
        is_featured, display_order, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      value.slug,
      value.title,
      value.description,
      value.details,
      value.category,
      value.projectType,
      value.year,
      value.icon,
      value.iconTheme,
      value.status,
      value.thumbnailUrl,
      JSON.stringify(value.gallery),
      JSON.stringify(value.techStack),
      value.demoUrl,
      value.repoUrl,
      value.downloadUrl,
      value.featured ? 1 : 0,
      value.displayOrder,
      value.publishedAt
    );

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(toPublicProject(project));
});

app.put("/api/admin/projects/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid project id." });
  }

  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Project not found." });
  }

  const { errors, value } = validateProjectInput(req.body || null, existing);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  db.prepare(
    `UPDATE projects
     SET slug = ?,
         title = ?,
         description = ?,
         details = ?,
         category = ?,
         project_type = ?,
         year = ?,
         icon = ?,
         icon_theme = ?,
         status = ?,
         thumbnail_url = ?,
         gallery_json = ?,
         tech_stack_json = ?,
         demo_url = ?,
         repo_url = ?,
         download_url = ?,
         is_featured = ?,
         display_order = ?,
         published_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    value.slug,
    value.title,
    value.description,
    value.details,
    value.category,
    value.projectType,
    value.year,
    value.icon,
    value.iconTheme,
    value.status,
    value.thumbnailUrl,
    JSON.stringify(value.gallery),
    JSON.stringify(value.techStack),
    value.demoUrl,
    value.repoUrl,
    value.downloadUrl,
    value.featured ? 1 : 0,
    value.displayOrder,
    value.publishedAt,
    id
  );

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return res.json(toPublicProject(updated));
});

app.delete("/api/admin/projects/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid project id." });
  }

  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Project not found." });
  }

  return res.status(204).send();
});

const publicDir = path.join(__dirname, "..", "public");
app.use(
  express.static(publicDir, {
    etag: true,
    maxAge: NODE_ENV === "production" ? "1d" : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }

      if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      }
    },
  })
);

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/trend-lab", (_req, res) => {
  res.sendFile(path.join(publicDir, "trend-lab.html"));
});

app.get("/trend-lab-v2", (_req, res) => {
  res.sendFile(path.join(publicDir, "trend-lab-v2.html"));
});

app.get("/projects/:slug", (_req, res) => {
  res.sendFile(path.join(publicDir, "project.html"));
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`Signor Vale running on http://localhost:${PORT}`);
});
