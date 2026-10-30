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

## Run the frontend
```bash
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```
Vite proxies `/api` to the backend on port 8000, so start both.
