# StudySphere AI — Dockerized Starter

This package runs the existing StudySphere AI starter as four Docker Compose services:

- React + Vite frontend: http://localhost:5173
- Node.js + Express API: http://localhost:5000
- FastAPI document processor: internal service on port 8000
- PostgreSQL + pgvector: internal port 5432, host port 5433

## Requirements

- Docker Desktop running with the Docker Engine started
- Internet connection for the first image builds

## Start on Windows PowerShell

1. Extract this folder.
2. Open PowerShell in the `universal-ai-study-platform` folder.
3. Optional: copy `.env.example` to `.env` and add your `OPENAI_API_KEY`.
   The API key is optional; without it, the app returns a clearly-labelled source preview.
4. Build and start all services:

   ```powershell
   docker compose up --build
   ```

5. Open http://localhost:5173.

The first build can take several minutes. Keep this terminal open while using the app.

## Useful commands

Show running containers:

```powershell
docker compose ps
```

Follow logs:

```powershell
docker compose logs -f
```

View only backend logs:

```powershell
docker compose logs -f backend
```

Stop services but keep database data:

```powershell
docker compose down
```

Start again:

```powershell
docker compose up -d
```

Stop services AND delete the database volume (this permanently deletes stored database records):

```powershell
docker compose down -v
```

Do not run `docker compose down -v` unless you intentionally want to erase the StudySphere database.

## Notes

- The backend uses `db:5432` and `processor:8000` inside the Compose network. Do not change these to `localhost` in the container configuration.
- PostgreSQL is published on host port `5433` to avoid conflicting with a PostgreSQL server already using host port `5432`.
- The browser frontend calls `http://localhost:5000/api`; this is correct when opening the app on the same computer.
- Supported upload formats: PDF, DOCX, PPTX, TXT and CSV (maximum 25 MB).
- Scanned-PDF OCR is not included in this version. PDF extraction reads embedded text.
- This is a learning/MVP setup, not a production deployment. Do not upload confidential or patient data without appropriate approvals and security controls.
