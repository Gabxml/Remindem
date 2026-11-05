import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import close_db, init_db, save_snapshot
from .routes import auth, dashboard, reminders


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    close_db()


app = FastAPI(title="Reminder Calendar", lifespan=lifespan)


@app.middleware("http")
async def persist_dev_changes(request, call_next):
    """Persist the file-backed dev database after writes."""
    response = await call_next(request)
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        save_snapshot()
    return response


origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"]
)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(reminders.router)
api.include_router(dashboard.router)
app.include_router(api)


@app.get("/api/health")
def health():
    return {"status": "ok"}
