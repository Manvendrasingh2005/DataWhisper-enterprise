# DataWhisper Enterprise: Production Deployment Guide

This guide details multiple production deployment strategies for **DataWhisper Enterprise**, including Render Cloud, Docker Compose, and traditional Linux VPS setups.

---

## 1. Option A: Render Cloud Deployment (Recommended)

DataWhisper is natively pre-configured for **Render** via Infrastructure-as-Code ([`render.yaml`](../render.yaml)).

### Steps:
1. **Push your code to GitHub**.
2. **Log into [Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** > **Blueprint**.
4. Select your `DataWhisper-enterprise` repository.
5. Render will automatically parse `render.yaml` and configure:
   - **`datawhisper-db`**: Managed PostgreSQL Database.
   - **`datawhisper-backend`**: Python Web Service running Gunicorn and WhiteNoise.
   - **`datawhisper-frontend`**: Static Site hosting the compiled React 19 app.
6. Provide your **`GEMINI_API_KEY`** in the environment settings.
7. Click **Apply**. Render will run [`backend/build.sh`](../backend/build.sh), execute database migrations, collect static files, build the frontend, and deploy live URLs!

---

## 2. Option B: Docker Compose Deployment

A production-ready [`docker-compose.yml`](../docker-compose.yml) is included at the repository root.

### Prerequisites:
- Docker Engine 24+ and Docker Compose v2+.

### Quick Run:
```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env and set GEMINI_API_KEY and SECRET_KEY

# 2. Build and run containers in detached mode
docker compose up -d --build

# 3. Run database migrations inside the backend container
docker compose exec backend python manage.py migrate

# 4. Seed the enterprise demo database
docker compose exec backend python manage.py seed_db

# 5. Create superuser
docker compose exec backend python manage.py createsuperuser
```

Your services will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 3. Production Security Checklist

Before exposing your deployment to the public internet:
1. **Set `DEBUG=False`**: Ensure `RENDER` or production environment flags are present so Django disables debug error pages.
2. **Configure `ALLOWED_HOSTS`**: In `core/settings.py`, replace `['*']` with your explicit domain names (e.g., `['api.datawhisper.com']`).
3. **Configure `CORS_ALLOWED_ORIGINS`**: Only permit your production frontend domain (e.g., `https://app.datawhisper.com`).
4. **Enforce HTTPS**: Use Let's Encrypt / Cloudflare SSL or enable Django's `SECURE_SSL_REDIRECT = True`.
5. **Set strong `SECRET_KEY`**: Never use the default fallback key in production environments.
