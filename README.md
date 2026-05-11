# TaskFlow

A full-stack task management app with a list view, Kanban board, subtasks, and link attachments.
🚀 Live Demo: https://acceptable-caring-production-b64a.up.railway.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI · SQLAlchemy (async) · PostgreSQL · Alembic · JWT auth |
| Frontend | React 18 · Vite · React Router · CSS Modules |
| Email | Resend API |
| File storage | Cloudinary |
| Auth | JWT + Google OAuth 2.0 |
| Deploy | Railway (backend + DB) |
| Containers | Docker · Docker Compose |

## Features

- **Auth** — register, login, Google OAuth; JWT access + refresh tokens
- **Tasks** — create, edit, delete; priority (High / Medium / Low); status (To Do → In Progress → Done)
- **Dates** — start date + end date per task; overdue highlighting
- **Subtasks** — add / complete / delete subtasks within a task
- **Attachments** — attach links or upload files (Cloudinary) to tasks and subtasks; image preview inline
- **Sharing** — share a task via email (generates a public read-only link)
- **Views** — List view with filters + Kanban board with drag-and-drop
- **AI** — estimate task time with Gemini AI

## Getting Started

### With Docker Compose (recommended)

```bash
# Copy and fill in environment variables
cp backend/.env.example backend/.env

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs

### Local development

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in DATABASE_URL, SECRET_KEY, RESEND_API_KEY
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskflow
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
RESEND_API_KEY=re_...
MAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
GEMINI_API_KEY=your-gemini-key
```

## Running Tests

```bash
# All tests (from repo root)
.\backend\venv\Scripts\python.exe -m pytest tests/ -v

# Only unit tests (no DB)
.\backend\venv\Scripts\python.exe -m pytest tests/unit/ -v

# Only integration tests
.\backend\venv\Scripts\python.exe -m pytest tests/integration/ -v

# With coverage report
.\backend\venv\Scripts\python.exe -m pytest tests/ --cov=app --cov-report=term-missing
```

**Test structure:**
```
tests/
  unit/
    test_security.py        # password hashing, JWT tokens
    test_task_status.py     # status transition rules
    test_email.py           # email service (mocked)
  integration/
    test_auth.py            # register, login, refresh
    test_tasks.py           # CRUD, status transitions, access control
    test_share.py           # share tokens, public access
  e2e/
    user_stories.md         # US-01–US-10 scenarios for Puppeteer MCP
    specs/                  # Playwright specs (auth, tasks, kanban)
```

### E2E / User Story tests (Puppeteer MCP)

These run interactively via Claude Code + Puppeteer MCP with both servers running:

```bash
# 1. Install Puppeteer MCP (once)
claude mcp add --scope user puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# 2. Start the app
cd backend && uvicorn app.main:app --reload   # terminal 1
cd frontend && npm run dev                     # terminal 2

# 3. Open Claude Code CLI from the project root
claude

# 4. Ask Claude to run the tests
# "Run the e2e user story tests from tests/e2e/user_stories.md, US-01 through US-10"
```

All 10 user stories pass (registration, login/logout, task CRUD, status flow, filters, subtasks, attachments, Kanban drag-and-drop, delete).

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login → token pair |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/{id}` | Update task |
| PATCH | `/api/tasks/{id}/status` | Change status |
| DELETE | `/api/tasks/{id}` | Delete task |
| GET | `/api/tasks/{id}/subtasks` | List subtasks |
| POST | `/api/tasks/{id}/subtasks` | Add subtask |
| PATCH | `/api/tasks/{id}/subtasks/{sub_id}` | Update subtask |
| DELETE | `/api/tasks/{id}/subtasks/{sub_id}` | Delete subtask |
| GET | `/api/tasks/{id}/attachments` | List task attachments |
| POST | `/api/tasks/{id}/attachments` | Add link to task |
| DELETE | `/api/tasks/{id}/attachments/{att_id}` | Remove attachment |
| POST | `/api/tasks/{id}/subtasks/{sub_id}/attachments` | Add link to subtask |
| DELETE | `/api/tasks/{id}/subtasks/{sub_id}/attachments/{att_id}` | Remove subtask attachment |
| POST | `/api/share/{task_id}` | Share task via email |
| GET | `/api/share/{token}` | Public task view |

Full interactive docs: `http://localhost:8000/api/docs`

## Database Migrations

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1
```

## Resource Consumption

> Captured locally via `docker stats` and `docker compose exec db psql -U taskflow -c "\l+"`.
> Host machine: Windows 11, 7.6 GiB RAM. All three app containers run comfortably within ~150 MiB total.

### Idle state (app running, no users)

| Container | CPU % | Memory |
|-----------|-------|--------|
| web-frontend-1 | 0.00% | 17.3 MiB |
| web-backend-1 | — | — |
| web-db-1 | 0.00% | 34.7 MiB |

![Docker stats — idle](docs/screenshots/stats_idle.png)

### Under load (registration + tasks created + Kanban used)

| Container | CPU % | Memory |
|-----------|-------|--------|
| web-frontend-1 | 0.00% | 19.4 MiB |
| web-backend-1 | 0.20% | 71.7 MiB |
| web-db-1 | 4.07% | 29.3 MiB |

![Docker stats — under load](docs/screenshots/stats_load.png)

### Database size

`taskflow` database: **7895 kB (~7.7 MB)** after initial data load.

![PostgreSQL database list](docs/screenshots/db_size.png)

To reproduce locally:
```bash
# Live resource stats
docker stats

# PostgreSQL DB size
docker compose exec db psql -U taskflow -c "\l+"
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/routes/     # auth, tasks, subtasks, attachments, share
│   │   ├── core/           # config, security (JWT, bcrypt)
│   │   ├── db/             # SQLAlchemy models + session
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # email (Resend)
│   ├── alembic/versions/   # DB migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # axios wrappers (tasks, subtasks, attachments)
│   │   ├── components/     # TaskCard, TaskModal, StatusBadge, Navbar …
│   │   ├── pages/          # TasksPage, KanbanPage, LoginPage …
│   │   ├── hooks/          # useTasks, useAuth
│   │   └── styles/         # CSS Modules
│   └── Dockerfile
├── tests/
│   ├── unit/               # pure Python, no DB
│   └── integration/        # full HTTP stack, SQLite
├── docker-compose.yml
└── pytest.ini
```
