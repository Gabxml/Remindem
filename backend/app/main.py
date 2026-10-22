import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routes import auth, dashboard, reminders


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Reminder Calendar", lifespan=lifespan)

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
