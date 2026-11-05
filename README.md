# Reminder Calendar

Python (FastAPI + MongoDB) backend, React (Vite) frontend.

## Run the backend
Start MongoDB (or point `MONGODB_URI` at an Atlas cluster):
```bash
docker run --rm -p 27017:27017 mongo:7
```

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000           # API docs: http://localhost:8000/docs
pytest                                              # run the tests (uses an in-memory MongoDB)
```
`MONGODB_URI` defaults to `mongodb://localhost:27017/remindem`.
Set `SECRET_KEY` in your environment before deploying anywhere real.

No MongoDB handy? Run the backend with the file-backed in-memory database:
```bash
REMINDEM_IN_MEMORY=1 uvicorn app.main:app --reload --port 8000
```
On Windows PowerShell, set it first: `$env:REMINDEM_IN_MEMORY = "1"`.

Data is saved to `backend/remindem-dev-data.json` after every change and restored on
startup, so it survives restarts. Delete that file to start fresh, or override the path
with `REMINDEM_DATA_FILE`.

## Run the frontend
```bash
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```
Vite proxies `/api` to the backend on port 8000, so start both.

The login screen is temporarily bypassed: the app auto-signs in as a local demo user.
Set `AUTH_DISABLED = false` in `frontend/src/dev.js` to bring it back.
