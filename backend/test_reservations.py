from datetime import datetime, timedelta, timezone
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-at-least-32-bytes-long")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import base, get_db
from main import app
import models
from routers.users import (
    create_access_token,
    get_password_hash,
    login_rate_limiter,
    register_rate_limiter,
)

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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
    login_rate_limiter.reset()
    register_rate_limiter.reset()
    client.cookies.clear()

    db = TestingSessionLocal()
    db.add(
        models.Seat(
            id=1,
            seat_number="A1",
            zone="Open Space",
            office_name="Warsaw",
            desk_type="standard",
            has_monitor=True,
            is_active=True,
        )
    )
    db.commit()
    db.close()

    yield
    client.cookies.clear()
    base.metadata.drop_all(bind=engine)


def test_time_travel():
    db = TestingSessionLocal()
    db.add(models.User(id=99, name="TestUser", email="test@test.com", password="test", role="employee"))
    db.commit()
    db.close()

    token = create_access_token({"sub": "99"})
    client.cookies.set("access_token", f"Bearer {token}")

    response = client.post(
        "/api/reservations/",
        json={
            "seat_id": 1,
            "res_start_time": "2030-01-01T15:00:00",
            "res_end_time": "2030-01-01T12:00:00",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Reservation end time must be after the start time."


def test_overbooking():
    db = TestingSessionLocal()
    db.add(models.User(id=1, name="UserOne", email="one@test.com", password="test", role="employee"))
    db.add(models.User(id=2, name="UserTwo", email="two@test.com", password="test", role="employee"))
    db.commit()
    db.close()

    token1 = create_access_token({"sub": "1"})
    client.cookies.set("access_token", f"Bearer {token1}")

    res1 = client.post(
        "/api/reservations/",
        json={
            "seat_id": 1,
            "res_start_time": "2030-01-01T12:00:00",
            "res_end_time": "2030-01-01T14:00:00",
        },
    )
    assert res1.status_code == 200

    token2 = create_access_token({"sub": "2"})
    client.cookies.set("access_token", f"Bearer {token2}")

    res2 = client.post(
        "/api/reservations/",
        json={
            "seat_id": 1,
            "res_start_time": "2030-01-01T12:00:00",
            "res_end_time": "2030-01-01T15:00:00",
        },
    )
    assert res2.status_code == 400
    assert "The seat is unavailable" in res2.json()["detail"]


def test_available_seats_and_maintenance_timezone_handling():
    res = client.get("/api/seats/available?start_time=2030-01-01T10:00:00&end_time=2030-01-01T12:00:00")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["is_available"] is True
    assert data[0]["is_active"] is True

    db = TestingSessionLocal()
    db.add(models.User(id=10, name="AdminUser", email="admin@test.com", password="test", role="admin"))
    db.commit()
    db.close()

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '10'})}")
    toggle = client.patch(
        "/api/seats/1/toggle",
        json={
            "maintenance_start": "2030-01-01T09:00:00Z",
            "maintenance_end": "2030-01-01T13:00:00Z",
        },
    )
    assert toggle.status_code == 200

    res_after = client.get("/api/seats/available?start_time=2030-01-01T10:00:00&end_time=2030-01-01T12:00:00")
    assert res_after.status_code == 200
    assert res_after.json()[0]["is_active"] is False

    bad_range = client.get("/api/seats/available?start_time=2030-01-01T12:00:00&end_time=2030-01-01T10:00:00")
    assert bad_range.status_code == 400


def test_register_login_logout_and_cookie_flags():
    reg = client.post(
        "/api/register",
        json={"username": "Alice", "email": "Alice@Example.com", "password": "secretpassword"},
    )
    assert reg.status_code == 201
    assert reg.json()["email"] == "alice@example.com"
    assert reg.json()["role"] == "employee"

    dup = client.post(
        "/api/register",
        json={"username": "Alice2", "email": "alice@example.com", "password": "secretpassword"},
    )
    assert dup.status_code == 400

    bad_email = client.post(
        "/api/register",
        json={"username": "Bob", "email": "not-an-email", "password": "secretpassword"},
    )
    assert bad_email.status_code == 422

    login_res = client.post(
        "/api/login",
        json={"email": "ALICE@example.com", "password": "secretpassword"},
    )
    assert login_res.status_code == 200
    set_cookie = login_res.headers.get("set-cookie", "").lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie

    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"

    logout_res = client.post("/api/logout")
    assert logout_res.status_code == 200
    assert client.get("/api/me").status_code == 401


def test_rbac_and_malformed_jwt_rejected():
    db = TestingSessionLocal()
    db.add(
        models.User(
            id=20,
            name="Emp",
            email="emp@test.com",
            password=get_password_hash("password123"),
            role="employee",
        )
    )
    db.commit()
    db.close()

    assert client.get("/api/reservations/").status_code == 401
    assert client.get("/api/admin/analytics").status_code == 401

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': 'not-an-int'})}")
    assert client.get("/api/me").status_code == 401

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '20'})}")
    assert client.get("/api/reservations/").status_code == 403
    assert client.get("/api/admin/analytics").status_code == 403
    assert (
        client.post(
            "/api/seats/",
            json={
                "seat_number": "Z1",
                "zone": "Open Space",
                "desk_type": "standard",
                "office_name": "Warsaw",
                "has_monitor": False,
            },
        ).status_code
        == 403
    )


def test_atomic_recurring_reservation_and_inactive_seat():
    db = TestingSessionLocal()
    db.add(models.User(id=30, name="User30", email="u30@test.com", password="x", role="employee"))
    db.add(models.User(id=31, name="User31", email="u31@test.com", password="x", role="employee"))
    db.add(
        models.Seat(
            id=2,
            seat_number="A2",
            zone="Open Space",
            office_name="Warsaw",
            desk_type="standard",
            has_monitor=False,
            is_active=False,
        )
    )
    db.commit()
    db.close()

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '31'})}")
    pre = client.post(
        "/api/reservations/",
        json={
            "seat_id": 1,
            "res_start_time": "2030-02-02T10:00:00",
            "res_end_time": "2030-02-02T12:00:00",
        },
    )
    assert pre.status_code == 200

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '30'})}")
    conflict_recurring = client.post(
        "/api/reservations/",
        json={
            "seat_id": 1,
            "res_start_time": "2030-02-01T10:00:00",
            "res_end_time": "2030-02-01T12:00:00",
            "recurrence_rule": "daily",
            "recurrence_end_date": "2030-02-03T23:59:00",
        },
    )
    assert conflict_recurring.status_code == 400
    assert client.get("/api/reservations/my").json() == []

    inactive_res = client.post(
        "/api/reservations/",
        json={
            "seat_id": 2,
            "res_start_time": "2030-02-05T10:00:00",
            "res_end_time": "2030-02-05T12:00:00",
        },
    )
    assert inactive_res.status_code == 400

    missing_seat = client.post(
        "/api/reservations/",
        json={
            "seat_id": 999,
            "res_start_time": "2030-02-05T10:00:00",
            "res_end_time": "2030-02-05T12:00:00",
        },
    )
    assert missing_seat.status_code == 404


def test_checkin_and_cancel_state_transitions():
    now = datetime.now(timezone.utc)
    db = TestingSessionLocal()
    db.add(models.User(id=40, name="User40", email="u40@test.com", password="x", role="employee"))
    res_obj = models.Reservation(
        id=100,
        user_id=40,
        seat_id=1,
        res_start_time=now + timedelta(minutes=5),
        res_end_time=now + timedelta(hours=2),
        status=models.ReservationStatus.PENDING,
    )
    db.add(res_obj)
    db.commit()
    db.close()

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '40'})}")
    checkin = client.patch("/api/reservations/100/checkin")
    assert checkin.status_code == 200

    cancel_checked_in = client.patch("/api/reservations/100/my-cancel")
    assert cancel_checked_in.status_code == 400


def test_admin_reservation_list_and_detail_include_user_and_seat():
    db = TestingSessionLocal()
    db.add(models.User(id=50, name="Admin50", email="admin50@test.com", password="x", role="admin"))
    db.add(models.User(id=51, name="Alice Employee", email="alice51@test.com", password="x", role="employee"))
    res_obj = models.Reservation(
        id=200,
        user_id=51,
        seat_id=1,
        res_start_time=datetime(2030, 3, 1, 9, 0, tzinfo=timezone.utc),
        res_end_time=datetime(2030, 3, 1, 11, 30, tzinfo=timezone.utc),
        status=models.ReservationStatus.CONFIRMED,
    )
    db.add(res_obj)
    db.commit()
    db.close()

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '51'})}")
    assert client.get("/api/reservations/200").status_code == 403

    client.cookies.set("access_token", f"Bearer {create_access_token({'sub': '50'})}")
    list_res = client.get("/api/reservations/")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == 200
    assert items[0]["user"] == {
        "id": 51,
        "name": "Alice Employee",
        "email": "alice51@test.com",
        "role": "employee",
    }
    assert items[0]["seat"] == {
        "id": 1,
        "seat_number": "A1",
        "zone": "Open Space",
        "desk_type": "standard",
        "office_name": "Warsaw",
        "has_monitor": True,
        "is_active": True,
    }

    detail_res = client.get("/api/reservations/200")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == 200
    assert detail["user"]["name"] == "Alice Employee"
    assert detail["user"]["email"] == "alice51@test.com"
    assert detail["seat"]["seat_number"] == "A1"
    assert detail["seat"]["office_name"] == "Warsaw"

    missing_res = client.get("/api/reservations/99999")
    assert missing_res.status_code == 404
