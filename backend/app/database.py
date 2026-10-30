import os

from mongoengine import connect, disconnect

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/remindem")


def init_db() -> None:
    """Open MongoEngine's default connection. Safe to call more than once."""
    disconnect(alias="default")
    connect(host=MONGODB_URI, alias="default", uuidRepresentation="standard")


def close_db() -> None:
    disconnect(alias="default")
