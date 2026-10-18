# NEXUS Deployment Guide

## 1. Deployment Profiles

NEXUS supports two primary deployment topologies:
1. **Standalone Edge Mode** (Local Development & Edge Workstations):
   - Fast, zero external infrastructure required.
   - Local SQLite database with vectorized memory search.
   - Built-in OpenCV webcam capture and local deterministic safety responder.
2. **Enterprise Distributed Mode** (Production Facilities):
   - PostgreSQL 16+ with `pgvector` extension.
   - Scaled FastAPI backend behind NGINX / Cloudflare reverse proxy.
   - Static frontend served via CDN / NGINX.
   - Cloud LLM integration (Google Gemini 1.5/2.0 API).

---

## 2. Docker Compose Setup (Production Profile)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_USER: nexus_user
      POSTGRES_PASSWORD: nexus_secure_password
      POSTGRES_DB: nexus_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    restart: always
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql+asyncpg://nexus_user:nexus_secure_password@db:5432/nexus_db
      - JWT_SECRET_KEY=change_me_to_a_secure_random_key
      - LLM_PROVIDER=local
    ports:
      - "8000:8000"
    volumes:
      - ./backend/storage:/app/storage

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 3. Production Environment Checklist
- [ ] Generate a cryptographically secure `JWT_SECRET_KEY` with `openssl rand -hex 32`.
- [ ] Configure HTTPS/TLS certificates (Let's Encrypt / Certbot).
- [ ] Set `DEMO_MODE=false` when deploying with physical production camera sensors.
- [ ] Restrict CORS origins in backend `.env` to the specific corporate domain.
- [ ] Verify automated evidence retention cron job runs nightly.

---

## 4. Vercel Frontend Deployment (Resolving FUNCTION_INVOCATION_FAILED)

### Root Cause Analysis of `HTTP 500 FUNCTION_INVOCATION_FAILED`
When deploying a full-stack monorepo containing Python backend files (`backend/main.py`) to Vercel without explicit frontend target configuration:
1. **Serverless Runtime Incompatibility**: Vercel auto-detects Python files and attempts to deploy them as AWS Lambda serverless functions (`@vercel/python`).
2. **Missing C-Libraries & Binary Bloat**: Libraries like `opencv-python-headless` and `torch` fail on serverless runtimes due to missing system GL libraries and Lambda package size limits (>250MB).
3. **Read-Only Filesystem & Lifecycle Crashes**: Serverless Lambdas run on read-only filesystems (`/var/task`), crashing SQLite writes or startup lifespan initializations (`Base.metadata.create_all`).
4. **WebSocket & Streaming Incompatibility**: Long-running camera streaming, continuous OpenCV video loops, and persistent WebSockets cannot run in ephemeral serverless execution.

### The Decoupled Architecture Solution
- **Vercel**: Hosts the **Vite React SPA** purely as optimized static assets with client-side SPA routing (`index.html` fallback).
- **Persistent Backend Host**: Runs the **FastAPI + OpenCV + pgvector** service on Docker, Render, Railway, or AWS ECS.
- **Frontend-Backend Binding**: Connect via the `VITE_API_URL` environment variable.

### Vercel Configuration Files
1. **Root `vercel.json`**:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm --prefix frontend run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

2. **Root `.vercelignore`**:
```
backend
docs
.github
*.db
.pytest_cache
```
Prevents Vercel from scanning or creating serverless functions from backend Python files.

3. **Frontend `frontend/vercel.json`**:
Configured with Vite presets and SPA rewrites if deploying with Vercel's Root Directory setting set to `frontend`.

### Vercel Environment Variables
In your Vercel Project Settings > Environment Variables:
- `VITE_API_URL`: `https://api.yourdomain.com/api/v1` (public address of your persistent FastAPI backend).

