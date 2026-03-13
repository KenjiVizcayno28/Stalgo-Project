# Final Project 1

This project is a full-stack game top-up store with:

- a Django REST backend in `backend/`
- a React frontend in `frontend/`
- PostgreSQL as the only supported database
- Gemini-based AI features for search and recommendations

The shop catalog is stored in PostgreSQL, not in `db.sqlite3`. Product creation, stock toggling, descriptions, and image uploads are managed from the admin side of the app.

## Project structure

```text
Final-Project-1/
├── backend/                  Django project
│   ├── manage.py
│   ├── backend/              Django settings/urls
│   ├── products/             Main app
│   ├── media/                Uploaded images
│   └── .env.example          Backend environment template
├── frontend/                 React app
│   ├── package.json
│   └── src/
├── requirements.txt          Python backend dependencies
└── README.md
```

## Tech stack

- Backend: Django, Django REST Framework, Token Authentication
- Frontend: React, React Bootstrap, Axios
- Database: PostgreSQL
- AI: Google Gemini API
- Media handling: Pillow + Django media uploads

## Prerequisites

Install these before running the project:

1. Python 3.11 or newer
2. Node.js 18 or newer with npm
3. PostgreSQL 14 or newer
4. Git (optional, but recommended)

Windows was the main development environment for this project, so the commands below are written for Windows PowerShell.

## 1. Clone or open the project

If you already have the project folder, open it directly in VS Code.

If you are cloning it:

```powershell
git clone <your-repository-url>
cd Final-Project-1
```

## 2. Create and activate a Python virtual environment

From the project root:

```powershell
py -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run this once in PowerShell as your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 3. Install Python dependencies

From the project root:

```powershell
pip install -r requirements.txt
```

## 4. Install frontend dependencies

Move into the frontend folder and install the React dependencies:

```powershell
cd frontend
npm install
cd ..
```

## 5. Set up PostgreSQL

This project does not use SQLite. You must have PostgreSQL running locally or point the app to an existing PostgreSQL server.

Create a database. Example using the default `postgres` superuser:

```sql
CREATE DATABASE final_project_1;
```

You can do that from pgAdmin or from `psql`.

## 6. Configure backend environment variables

Copy the example environment file:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Then edit `backend/.env` and set the correct values.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=final_project_1
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=127.0.0.1
DB_PORT=5432
DB_CONN_MAX_AGE=60
DB_CONN_HEALTH_CHECKS=True
DB_CONNECT_TIMEOUT=5
```

### Environment variable reference

- `GEMINI_API_KEY`: required for AI search and recommendation features
- `ALLOWED_HOSTS`: comma-separated Django hosts
- `DB_NAME`: PostgreSQL database name
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_HOST`: PostgreSQL host, usually `127.0.0.1`
- `DB_PORT`: PostgreSQL port, usually `5432`
- `DB_CONN_MAX_AGE`: persistent DB connection lifetime in seconds
- `DB_CONN_HEALTH_CHECKS`: lets Django verify reused connections
- `DB_CONNECT_TIMEOUT`: PostgreSQL connection timeout in seconds

## 7. Apply database migrations

Run these commands from the `backend` folder:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py migrate
```

Important:

- run Django management commands from inside `backend/`
- use the project virtual environment Python, such as `..\venv\Scripts\python.exe`
- the catalog seed data is inserted during migration, so the storefront is not empty on first run

## 8. Create an admin account

Still inside the `backend` folder:

```powershell
..\venv\Scripts\python.exe manage.py createsuperuser
```

This account can:

- access Django admin
- access the in-app admin dashboard
- create and edit products
- upload product and unit design images
- toggle stock availability

## 9. Run the backend server

Start the Django backend from the `backend` folder:

```powershell
..\venv\Scripts\python.exe manage.py runserver
```

Backend default URL:

```text
http://127.0.0.1:8000/
```

If you want to force the host and port explicitly:

```powershell
..\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

## 10. Run the frontend server

Open a second terminal, then run:

```powershell
cd frontend
npm start
```

Frontend default URL:

```text
http://localhost:3000/
```

## 11. Build the frontend for production

From the project root:

```powershell
Push-Location frontend
npm run build
Pop-Location
```

## Default local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://127.0.0.1:8000/api/`
- Django admin: `http://127.0.0.1:8000/admin/`

## Main features

- User registration and login
- Token-based authentication
- Profile management with profile pictures
- Two-factor authentication support
- Product catalog stored in PostgreSQL
- Purchase history and inventory tracking
- Admin product management with uploads
- AI-assisted search and recommendation endpoints

## Common startup workflow

After the first setup, the normal daily workflow is:

1. Start PostgreSQL.
2. Open the project root.
3. Activate the virtual environment.
4. Run the backend from `backend/`.
5. Run the frontend from `frontend/`.

Example:

```powershell
# terminal 1
cd backend
..\venv\Scripts\python.exe manage.py runserver

# terminal 2
cd frontend
npm start
```

## Troubleshooting

### Backend fails to start

Check these first:

- PostgreSQL is running
- `backend/.env` exists and has valid DB credentials
- you are inside the `backend/` folder when running `manage.py`
- you are using the virtual environment Python, not a global Python installation

Useful check:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py check
```

### Port 8000 is already in use

If another process is already using port 8000, stop it or run Django on a different port.

Example to inspect port 8000 in PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen
```

### Frontend cannot reach backend

Check that:

- the backend is actually running on port 8000
- the frontend is calling `http://localhost:8000` or `http://127.0.0.1:8000` consistently
- CORS settings still allow local frontend origins

### AI features do not work

Check that:

- `GEMINI_API_KEY` is present in `backend/.env`
- the backend was restarted after changing `.env`
- the machine has internet access for Gemini API requests

## Notes about data and media

- Uploaded images are stored under `backend/media/`
- Static images used by the seeded catalog are under `backend/static/images/`
- Purchases and products are stored in PostgreSQL
- `db.sqlite3` is not part of the current backend setup

## Useful backend commands

From the `backend` folder:

```powershell
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py createsuperuser
..\venv\Scripts\python.exe manage.py check
..\venv\Scripts\python.exe manage.py runserver
```

## Summary

If you want the shortest possible run sequence after setup:

```powershell
# terminal 1
cd backend
..\venv\Scripts\python.exe manage.py runserver

# terminal 2
cd frontend
npm start
```

Make sure PostgreSQL is running first and that `backend/.env` contains valid database and Gemini API settings.

