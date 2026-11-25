import asyncio
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_secret_key, settings
from database import SessionLocal, to_utc
import models
from routers import admin, chat, reservations, seats, users


async def auto_cancel_no_shows():
    while True:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(minutes=15)
            expired_reservations = (
                db.query(models.Reservation)
                .filter(
                    models.Reservation.status.in_(
                        [models.ReservationStatus.CONFIRMED, models.ReservationStatus.PENDING]
                    ),
                    models.Reservation.res_start_time < cutoff,
                )
                .all()
            )

            for res in expired_reservations:
                window_end = to_utc(res.res_start_time) + timedelta(minutes=15)
                if now > window_end:
                    res.status = models.ReservationStatus.NO_SHOW
                    user = res.user
                    seat = res.seat
                    if user and seat:
                        print(f"\n[SIMULATED EMAIL] To: {user.email}")
                        print("Subject: Reservation Auto-Cancelled")
                        print(
                            f"Body: Your reservation for seat {seat.seat_number} was automatically "
                            "cancelled because you didn't check in within 15 minutes of the start time.\n"
                        )
                        db.add(
                            models.Notification(
                                user_id=user.id,
                                message=(
                                    f"Your reservation for seat {seat.seat_number} was automatically "
                                    "cancelled due to no-show."
                                ),
                            )
                        )
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"Error in auto_cancel task: {exc}")
        finally:
            db.close()

        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_secret_key()
    task = asyncio.create_task(auto_cancel_no_shows())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Reservation System API", lifespan=lifespan)

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip() and o.strip() != "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(users.router)
app.include_router(seats.router)
app.include_router(reservations.router)
app.include_router(admin.router)
app.include_router(chat.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "API works perfectly"}
