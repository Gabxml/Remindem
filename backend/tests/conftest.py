import mongomock
import pytest
from fastapi.testclient import TestClient
from mongoengine import connect, disconnect

from app.main import app


@pytest.fixture()
def client():
    # Each test gets a fresh in-memory MongoDB; no server required.
    disconnect(alias="default")
    connect(
        "remindem_test",
        mongo_client_class=mongomock.MongoClient,
        alias="default",
        uuidRepresentation="standard",
    )
    yield TestClient(app)
    disconnect(alias="default")


def make_user(client, email="a@example.com", name="Ana"):
    r = client.post("/api/auth/register", json={"email": email, "name": name, "password": "password123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def auth(client):
    return make_user(client)
