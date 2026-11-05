import os
from pathlib import Path

from bson import json_util
from mongoengine import connect, disconnect, get_db

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/remindem")
IN_MEMORY = os.getenv("REMINDEM_IN_MEMORY", "").lower() in {"1", "true", "yes"}
DATA_FILE = os.getenv(
    "REMINDEM_DATA_FILE",
    str(Path(__file__).resolve().parents[1] / "remindem-dev-data.json"),
)

_memory_connected = False


def _snapshot_path() -> Path:
    return Path(DATA_FILE)


def _load_snapshot() -> None:
    """Restore a previously saved in-memory database, if there is one."""
    path = _snapshot_path()
    if not path.exists():
        return
    try:
        data = json_util.loads(path.read_text(encoding="utf-8"))
        db = get_db()
        for name, docs in data.items():
            if docs:
                db[name].insert_many(docs)
    except Exception as exc:  # noqa: BLE001 - don't stop the app on a bad dev snapshot
        print(f"Could not load dev data from {path}: {exc}")


def save_snapshot() -> None:
    """Write the whole in-memory database to disk after a change."""
    if not (IN_MEMORY and _memory_connected):
        return
    try:
        db = get_db()
        data = {name: list(db[name].find()) for name in db.list_collection_names()}
        path = _snapshot_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json_util.dumps(data), encoding="utf-8")
        tmp.replace(path)
    except Exception as exc:  # noqa: BLE001 - persistence should never break a request
        print(f"Could not save dev data: {exc}")


def init_db() -> None:
    """Open MongoEngine's default connection. Safe to call more than once."""
    global _memory_connected

    disconnect(alias="default")
    if IN_MEMORY:
        # Local development without a MongoDB server, persisted to a JSON file.
        import mongomock

        connect(
            "remindem",
            mongo_client_class=mongomock.MongoClient,
            alias="default",
            uuidRepresentation="standard",
        )
        _memory_connected = True
        _load_snapshot()
        return
    _memory_connected = False
    connect(host=MONGODB_URI, alias="default", uuidRepresentation="standard")


def close_db() -> None:
    global _memory_connected

    save_snapshot()
    _memory_connected = False
    disconnect(alias="default")
