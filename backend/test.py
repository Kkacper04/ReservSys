from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_available_seats():
    start = "2026-08-10T10:00:00"
    end = "2026-08-10T12:00:00"

    response = client.get(f"/api/seats/available?start_time={start}&end_time={end}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)