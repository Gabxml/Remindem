import os

from mongoengine import connect, disconnect

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/remindem")
IN_MEMORY = os.getenv("REMINDEM_IN_MEMORY", "").lower() in {"1", "true", "yes"}


def init_db() -> None:
    """Open MongoEngine's default connection. Safe to call more than once."""
    disconnect(alias="default")
    if IN_MEMORY:
        # Local development without a MongoDB server. Data is lost on restart.
        import mongomock

        connect(
            "remindem",
            mongo_client_class=mongomock.MongoClient,
            alias="default",
            uuidRepresentation="standard",
        )
        return
    connect(host=MONGODB_URI, alias="default", uuidRepresentation="standard")


def close_db() -> None:
    disconnect(alias="default")
