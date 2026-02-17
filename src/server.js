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

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    year INTEGER NOT NULL,
    icon TEXT NOT NULL DEFAULT '✦',
    icon_theme TEXT NOT NULL DEFAULT 'invoice',
    is_featured INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get().count;
if (projectCount === 0) {
  const seed = db.prepare(
    `INSERT INTO projects (title, description, category, year, icon, icon_theme, is_featured, display_order)
     VALUES (@title, @description, @category, @year, @icon, @icon_theme, @is_featured, @display_order)`
  );

  const transaction = db.transaction((rows) => {
    for (const row of rows) {
      seed.run(row);
    }
  });

  transaction([
    {
      title: "SimpleInvoice",
      description:
        "Billing software that does not require an accounting degree. Removed everything except the act of getting paid.",
      category: "Web App",
      year: 2024,
      icon: "$",
      icon_theme: "invoice",
      is_featured: 1,
      display_order: 1,
    },
    {
      title: "CalmCal",
      description:
        "Scheduling without notification anxiety. Time management that respects attention.",
      category: "iOS",
      year: 2024,
      icon: "◷",
      icon_theme: "calendar",
      is_featured: 0,
      display_order: 2,
    },
    {
      title: "PlainNotes",
      description:
        "Note-taking with no AI, no collaboration, no syntax. Just text.",
      category: "macOS",
      year: 2023,
      icon: "✎",
      icon_theme: "notes",
      is_featured: 0,
      display_order: 3,
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
        imgSrc: ["'self'", "data:"],
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
app.use(express.json({ limit: "64kb" }));

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

function toPublicProject(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    year: row.year,
    icon: row.icon,
    iconTheme: row.icon_theme,
    featured: Boolean(row.is_featured),
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

function validateProjectInput(input) {
  const errors = [];
  const iconThemes = new Set(["invoice", "calendar", "notes"]);

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 80) {
    errors.push("title must be between 1 and 80 characters.");
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (!description || description.length > 300) {
    errors.push("description must be between 1 and 300 characters.");
  }

  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!category || category.length > 30) {
    errors.push("category must be between 1 and 30 characters.");
  }

  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    errors.push("year must be a valid 4-digit year.");
  }

  const icon = typeof input.icon === "string" ? input.icon.trim() : "";
  if (!icon || icon.length > 2) {
    errors.push("icon must be 1 or 2 characters.");
  }

  const iconTheme =
    typeof input.iconTheme === "string" ? input.iconTheme.trim() : "invoice";
  if (!iconThemes.has(iconTheme)) {
    errors.push("iconTheme must be one of: invoice, calendar, notes.");
  }

  const featured = Boolean(input.featured);
  const displayOrder = Number(input.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) {
    errors.push("displayOrder must be an integer between 0 and 9999.");
  }

  return {
    errors,
    value: {
      title,
      description,
      category,
      year,
      icon,
      iconTheme,
      featured,
      displayOrder,
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
       ORDER BY is_featured DESC, display_order ASC, id DESC`
    )
    .all();

  res.json(rows.map(toPublicProject));
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
  const { errors, value } = validateProjectInput(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const result = db
    .prepare(
      `INSERT INTO projects (title, description, category, year, icon, icon_theme, is_featured, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      value.title,
      value.description,
      value.category,
      value.year,
      value.icon,
      value.iconTheme,
      value.featured ? 1 : 0,
      value.displayOrder
    );

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(toPublicProject(project));
});

app.put("/api/admin/projects/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid project id." });
  }

  const exists = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!exists) {
    return res.status(404).json({ error: "Project not found." });
  }

  const { errors, value } = validateProjectInput(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  db.prepare(
    `UPDATE projects
     SET title = ?,
         description = ?,
         category = ?,
         year = ?,
         icon = ?,
         icon_theme = ?,
         is_featured = ?,
         display_order = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    value.title,
    value.description,
    value.category,
    value.year,
    value.icon,
    value.iconTheme,
    value.featured ? 1 : 0,
    value.displayOrder,
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
app.use(express.static(publicDir, { maxAge: NODE_ENV === "production" ? "7d" : 0 }));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`Signor Vale running on http://localhost:${PORT}`);
});
