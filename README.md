# Reminder Calendar

Python (FastAPI + SQLite) backend, React (Vite) frontend.

## Run the backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000           # API docs: http://localhost:8000/docs
pytest                                              # run the tests
```
Set `SECRET_KEY` in your environment before deploying anywhere real.

## Run the frontend
```bash
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```
Vite proxies `/api` to the backend on port 8000, so start both.
