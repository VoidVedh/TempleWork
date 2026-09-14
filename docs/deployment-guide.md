# Production Deployment & Operations Guide

## 1. Overview
Shree Siddhivinayak Mandir runs as a unified full-stack Node.js application:
- **Frontend**: Vite React SPA pre-built into `server/public/`
- **Backend**: Express REST API with high-performance SQLite (`better-sqlite3`)
- **Container**: Multi-stage production `Dockerfile` with native SQLite bindings

---

## 2. Deploying on Render

### Option A: Render Blueprint (Recommended)
1. Push your repository to GitHub.
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Select this repository.
4. Render will read `render.yaml` and configure:
   - Web Service with Docker runtime.
   - 1GB Persistent Disk mounted at `/app/server/data` (protecting `mandal.db`).
   - Automated `JWT_SECRET` generation.
   - Health check probe on `/api/health`.

### Option B: Manual Web Service
1. **Name**: `shree-siddhivinayak-mandir`
2. **Environment**: `Docker`
3. **Region**: `Singapore` (or closest to India)
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: `<your-random-32-char-secret>`
   - `MANDAL_UPI_ID`: `9029359525m@pnb`
   - `MANDAL_PAYEE_NAME`: `Shree Siddhivinayak Mandir`
5. **Disk**:
   - Name: `mandal-persistent-data`
   - Mount Path: `/app/server/data`
   - Size: `1 GB`

---

## 3. Persistent Data & Backups

The SQLite database file is stored at `/app/server/data/mandal.db`.
Because Render ephemeral containers discard filesystem changes on restart, **attaching a persistent disk is mandatory**.

To create a backup:
```bash
node server/scripts/backup_db.js
```
To verify database integrity:
```bash
node server/scripts/verify_db_integrity.js
```

---

## 4. Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `JWT_SECRET is required` | Environment variable missing | The container now includes a safe fallback, but you can explicitly set `JWT_SECRET` in your dashboard. |
| `x-render-routing: no-server` | Service deploying or wrong hostname | Check Render deploy logs to ensure status is `Live`. |
| `Database file locked` | Concurrent writes without WAL mode | SQLite runs in WAL (Write-Ahead Logging) mode automatically. Ensure disk is mounted. |
