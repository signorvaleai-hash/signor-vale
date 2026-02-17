# Signor Vale - Portfolio + Admin Backend

This project now runs as a Node.js web app with:
- Public portfolio site at `/`
- Public project detail pages at `/projects/:slug`
- Admin panel at `/admin`
- Backend API for projects (`/api/projects`, `/api/projects/:slug` + protected admin CRUD)
- SQLite persistence (configurable via `DB_PATH`)

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Set secure values in `.env`:
   - `ADMIN_PASSWORD` (at least 12 chars)
   - `JWT_SECRET` (at least 32 chars)
4. Start:
   ```bash
   npm run dev
   ```

Open:
- `http://localhost:3000/`
- `http://localhost:3000/admin`
- `http://localhost:3000/projects/simpleinvoice`

## Deployment (Render)

This repo includes `render.yaml` for Blueprint deploy.

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Render Dashboard: **New +** -> **Blueprint** -> select the repo.
3. Set secret env vars in Render when prompted:
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
4. Deploy.

Important:
- The blueprint uses a persistent disk and `DB_PATH=/var/data/site.db` so project updates survive redeploys.
- Admin access is via `/admin` using `ADMIN_USERNAME` + `ADMIN_PASSWORD`.

## Phase 1 content model

Projects now support:
- `slug`
- `title`, `description`, `details`
- `category`, `projectType` (`website` | `app` | `tool`)
- `status` (`draft` | `published`)
- `thumbnailUrl`, `gallery[]`
- `techStack[]`
- `demoUrl`, `repoUrl`, `downloadUrl`
- `featured`, `displayOrder`, `publishedAt`

Draft projects stay hidden from public APIs/pages until published.

## API summary

Public:
- `GET /api/projects`
- `GET /api/projects/:slug`

Admin:
- `POST /api/admin/login` -> returns JWT token
- `GET /api/admin/projects`
- `POST /api/admin/projects`
- `PUT /api/admin/projects/:id`
- `DELETE /api/admin/projects/:id`

All admin project routes require `Authorization: Bearer <token>`.
