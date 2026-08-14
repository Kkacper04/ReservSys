import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import base, get_db
import models
from sqlalchemy.pool import StaticPool
from routers.users import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db(): 
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_base():
    base.metadata.create_all(bind=engine)
    db= TestingSessionLocal()

    db.add(models.Seat(id=1, seat_number="A1", zone="A", office_name="Warszawa HQ", desk_type="Flex", has_monitor=True, is_active=True))
    db.commit()
    db.close()

    yield
    base.metadata.drop_all(bind = engine)

def test_time_travel():
    db = TestingSessionLocal()
    db.add(models.User(id=99, name="TestUser", email="test@test.com", password="test", role="user"))
    db.commit()

    from routers.users import create_access_token
    token = create_access_token({"sub": "99"})
    client.cookies.set("access_token", f"Bearer {token}")

    response = client.post("/api/reservations/", json={
        "seat_id": 1,
        "res_start_time": "2030-01-01T15:00:00",
        "res_end_time": "2030-01-01T12:00:00" 
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "Reservation end time must be after the start time."

def test_overbooking():
    db = TestingSessionLocal()
    db.add(models.User(id=1, name="UserOne", email="one@test.com", password="test", role="user"))
    db.add(models.User(id=2, name="UserTwo", email="two@test.com", password="test", role="user"))
    db.commit()
    db.close()

    token1 = create_access_token({"sub": "1"})
    client.cookies.set("access_token", f"Bearer {token1}")

    res1 = client.post("/api/reservations/", json={
        "seat_id": 1,
        "res_start_time": "2030-01-01T12:00:00",
        "res_end_time": "2030-01-01T14:00:00"
    })
    assert res1.status_code == 200

    #another user, same seat at the same time
    token2 = create_access_token({"sub": "2"})
    client.cookies.set("access_token", f"Bearer {token2}")
    
    res2 = client.post("/api/reservations/", json={
        "seat_id": 1,
        "res_start_time": "2030-01-01T12:00:00",
        "res_end_time": "2030-01-01T15:00:00"
    })
    assert res2.status_code == 400
    assert "The seat is already reserved" in res2.json()["detail"]
