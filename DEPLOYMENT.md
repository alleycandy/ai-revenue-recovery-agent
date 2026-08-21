# Deployment guide

## Render

This project is configured for a single Render Web Service. The FastAPI backend serves the vanilla-JS frontend from the same URL.

### Render settings

- Runtime: Python
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python version: `3.11.9` (also recorded in `runtime.txt`)

The app automatically seeds the demo SQLite database on startup when no customers exist. This makes a fresh deployment immediately usable.

## Local run

From `backend`:

```bash
pip install -r requirements.txt
python -m app.db.seed
uvicorn app.main:app --reload
```

Open `http://localhost:8000`.

## Important

Do not commit a real `.env` file or API secrets. The included `.env.example` contains placeholders only.

SQLite is suitable for the internship/demo deployment. For production use, migrate the database to PostgreSQL and use persistent storage/database infrastructure.
