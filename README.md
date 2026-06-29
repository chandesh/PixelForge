# PixelForge - Intelligent Image Resizing

Resize once, export everywhere. Upload an image, select from 40+ platform presets or custom sizes, and download all outputs in seconds.

---

## Features

- **One-to-many resizing** — single upload, unlimited output sizes
- **40+ presets** — pre-configured for wallpapers, social media, thumbnails, and documents
- **Custom sizes** — pixel-perfect control over any dimension
- **Batch processing** via Celery + Redis with real-time job polling
- **pyvips-powered** — libvips C bindings for fast processing, Pillow fallback
- **Dual storage** — local filesystem in dev (Docker volume), S3 in production
- **JWT auth** — register, login, token refresh, blacklist logout
- **Angular 19 SPA** — standalone components, reactive forms, Tailwind CSS
- **MongoDB-inspired design** — dark theme with accent green (#00ED64)

---

## Architecture

```
┌──────────────┐     ┌──────────┐     ┌──────────────┐
│   Angular 19  │────▶│  Nginx   │────▶│   Django 5   │
│  (standalone) │     │ (reverse │     │  (DRF APIs)  │
│   Port 4300   │◀────│  proxy)  │◀────│  Port 8383   │
└──────────────┘     └──────────┘     └──────┬───────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │   Celery Worker    │
                                    │  (image processing)│
                                    └─────────┬─────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐           ┌───────▼───────┐         ┌──────▼──────┐
              │ PostgreSQL │           │     Redis     │         │   Storage   │
              │   Port     │           │   Port 6363   │         │  Local/S3   │
              │   5454     │           │   (broker)    │         │             │
              └───────────┘           └───────────────┘         └─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Tailwind CSS, Angular Material |
| Backend | Python 3.12, Django 5, Django REST Framework |
| Processing | Celery + Redis, pyvips (primary), Pillow (fallback) |
| Database | PostgreSQL 16 |
| Storage | Local Docker volume (dev), AWS S3 (prod) |
| Auth | JWT (djangorestframework-simplejwt) |
| Deployment | Docker Compose + Nginx |

---

## Getting Started

### Prerequisites

- **Docker** 24+ and **Docker Compose** v2
- **Python** 3.12 (for local backend work outside Docker)
- **Node.js** 20+ (for local frontend work outside Docker)

### Quick Start

```bash
# 1. Copy environment file and edit with your settings
make init

# 2. Edit .env — at minimum verify SECRET_KEY and database credentials

# 3. Build and start all services
make start

# 4. Run database migrations
make migrate

# 5. Seed preset fixtures
make seed
```

The app will be available at:
- **Frontend**: http://localhost:4300
- **Backend API**: http://localhost:8383/api/
- **Django Admin**: http://localhost:8383/admin/

### Manual Setup (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_presets
python manage.py runserver 0.0.0.0:8383

# Celery Worker (separate terminal)
cd backend
celery -A core.celery worker --loglevel=info

# Frontend
cd frontend
npm install
npm start
```

---

## Storage

### Development (local)

Set `STORAGE_BACKEND=local` in `.env`. Files are stored in the `./media/` Docker volume mounted at `/app/media` on both the **backend** and **worker** containers. Django serves media via `/media/` in dev mode.

```env
STORAGE_BACKEND=local
MEDIA_ROOT=/app/media
MEDIA_URL=/media/
```

### Production (S3)

Set `STORAGE_BACKEND=s3` and fill AWS credentials:

```env
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=pixelforge-prod
AWS_S3_REGION_NAME=us-east-1
AWS_S3_SIGNED_URL_EXPIRY=3600
```

Files are uploaded via `boto3` and accessed through pre-signed URLs. The `./media` volume is **not** mounted in production.

---

## Makefile Reference

### Setup & Init
| Target | Description |
|--------|-------------|
| `make init` | Copy .env, create media/, install all deps |
| `make install-frontend` | npm install in frontend/ |
| `make install-backend` | pip install in backend/ |

### Build
| Target | Description |
|--------|-------------|
| `make build` | Build all dev services |
| `make build-frontend` | Build frontend only |
| `make build-backend` | Build backend only |
| `make build-prod` | Build all production services |
| `make build-prod-frontend` | Build frontend for production |
| `make build-prod-backend` | Build backend for production |

### Start / Stop
| Target | Description |
|--------|-------------|
| `make start` | Start all dev services |
| `make start-frontend` | Start frontend only |
| `make start-backend` | Start backend + db + redis |
| `make start-worker` | Start Celery worker only |
| `make start-prod` | Start all production services |
| `make stop` | Stop all dev services |
| `make stop-prod` | Stop all production services |

### Restart
| Target | Description |
|--------|-------------|
| `make restart` | Restart all dev services |
| `make restart-frontend` | Restart frontend only |
| `make restart-backend` | Restart backend only |
| `make restart-worker` | Restart worker only |
| `make restart-prod` | Restart all production containers |

### Rebuild
| Target | Description |
|--------|-------------|
| `make rebuild` | Full dev rebuild (down → build → up) |
| `make rebuild-frontend` | Rebuild frontend only |
| `make rebuild-backend` | Rebuild backend only |
| `make rebuild-prod` | Full production rebuild |
| `make rebuild-prod-frontend` | Prod rebuild frontend only |
| `make rebuild-prod-backend` | Prod rebuild backend only |

### Database
| Target | Description |
|--------|-------------|
| `make migrate` | Run Django migrations |
| `make makemigrations` | Generate new migrations |
| `make seed` | Load ResizePreset fixtures |
| `make db-shell` | Open psql shell |
| `make db-reset` | Drop and recreate database |

### Logs
| Target | Description |
|--------|-------------|
| `make logs` | Tail all dev logs |
| `make logs-backend` | Tail backend logs |
| `make logs-worker` | Tail worker logs |
| `make logs-frontend` | Tail frontend logs |
| `make logs-prod` | Tail production logs |

### Utilities
| Target | Description |
|--------|-------------|
| `make shell` | Django shell in backend container |
| `make bash-backend` | Bash in backend container |
| `make bash-frontend` | Shell in frontend container |
| `make clean-media` | Remove all files under ./media/ |
| `make clean` | Full reset (containers, volumes, media) |

### Testing
| Target | Description |
|--------|-------------|
| `make test` | Run all tests |
| `make test-backend` | Run Django tests |
| `make test-frontend` | Run Angular tests |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | Django secret key (required in prod) |
| `DJANGO_SETTINGS_MODULE` | `core.config.dev` | Settings module |
| `DEBUG` | `True` | Django debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed hostnames |
| `DATABASE_URL` | postgresql://pixelforge:pixelforge@db:5454/pixelforge | PostgreSQL connection |
| `POSTGRES_DB` | pixelforge | Database name |
| `POSTGRES_USER` | pixelforge | Database user |
| `POSTGRES_PASSWORD` | pixelforge | Database password |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | 60 | JWT access token TTL |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | 7 | JWT refresh token TTL |
| `CELERY_BROKER_URL` | redis://redis:6363/0 | Redis broker URL |
| `CELERY_RESULT_BACKEND` | redis://redis:6363/0 | Redis result backend |
| `STORAGE_BACKEND` | local | Storage backend (`local` or `s3`) |
| `MEDIA_ROOT` | /app/media | Local storage path |
| `MEDIA_URL` | /media/ | Local media URL prefix |
| `AWS_ACCESS_KEY_ID` | — | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | — | S3 secret key |
| `AWS_STORAGE_BUCKET_NAME` | — | S3 bucket name |
| `AWS_S3_REGION_NAME` | us-east-1 | S3 region |
| `AWS_S3_SIGNED_URL_EXPIRY` | 3600 | Pre-signed URL expiry (seconds) |
| `FRONTEND_URL` | http://localhost:4300 | Frontend URL for CORS |
| `CORS_ALLOWED_ORIGINS` | http://localhost:4300 | CORS allowed origins |
| `API_BASE_URL` | http://localhost:8383 | Backend API URL |

---

## Preset Categories

### Wallpaper
- Desktop HD (1920×1080), Desktop 4K (3840×2160), Desktop Ultrawide (3440×1440)
- Mobile (1080×1920), Tablet (1668×2388)

### Thumbnail
- YouTube (1280×720), Vimeo (1280×720), YouTube Mini (320×180)
- Blog (800×450), Article Card (600×400)

### Social / Newsfeed
- Instagram Post (1080×1080), Instagram Story (1080×1920), Instagram Landscape (1080×566)
- Facebook Post (1200×630), Facebook Cover (851×315), Facebook Story (1080×1920)
- Twitter/X Post (1200×675), Twitter/X Header (1500×500)
- LinkedIn Post (1200×627), LinkedIn Cover (1584×396)
- Pinterest Pin (1000×1500), TikTok (1080×1920)
- WhatsApp DP (500×500), Telegram Banner (1280×512)
- Open Graph (1200×630), Discord Banner (960×540)

### Document
- A4 72dpi (595×842), A4 150dpi (1240×1754), A4 300dpi (2480×3508)
- Letter 72dpi (612×792), Letter 300dpi (2550×3300)
- Favicon (32×32), Favicon HD (64×64), Apple Touch Icon (180×180)
- App Icon iOS (1024×1024), App Icon Android (512×512)

---

## API Reference

All endpoints return a consistent JSON envelope:
```json
{ "success": bool, "data": any, "message": str, "errors": any }
```

### Auth (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Create account (name, email, password) |
| POST | `/api/auth/login/` | Login → access + refresh JWT |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Invalidate refresh token |

### Users (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/` | Get current user profile |
| PUT | `/api/users/me/` | Update profile |
| POST | `/api/users/change-password/` | Change password |

### Images (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/presets/` | List presets grouped by category |
| POST | `/api/jobs/` | Create resize job |
| GET | `/api/jobs/` | Paginated job history |
| GET | `/api/jobs/{id}/` | Job detail with outputs |
| DELETE | `/api/jobs/{id}/` | Soft delete job |
| GET | `/api/jobs/{id}/download/` | Download outputs |

---

## Browser Support

- Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ (modern evergreen)
- Mobile-first responsive design at 375px, 768px, 1280px breakpoints
- Not tested on IE11 or legacy browsers

---

## License

MIT
