from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine, SessionLocal
from routers import users, seats, reservations, chat
from config import settings
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

async def auto_cancel_no_shows():
    while True:
        try:
            db = SessionLocal()
            now = datetime.now(timezone.utc)
            expired_reservations = db.query(models.Reservation).filter(
                models.Reservation.status == models.ReservationStatus.CONFIRMED
            ).all()

            for res in expired_reservations:
                window_end = res.res_start_time + timedelta(minutes=15)
                if now > window_end:
                    res.status = models.ReservationStatus.NO_SHOW # type: ignore
                    user = res.user
                    seat = res.seat
                    
                    print(f"\n[SIMULATED EMAIL] To: {user.email}")
                    print(f"Subject: Reservation Auto-Cancelled")
                    print(f"Body: Your reservation for seat {seat.seat_number} was automatically cancelled because you didn't check in within 15 minutes of the start time.\n")
                    
                    new_notification = models.Notification(
                        user_id=user.id,
                        message=f"Your reservation for seat {seat.seat_number} was automatically cancelled due to no-show."
                    )
                    db.add(new_notification)
            db.commit()
            db.close()
        except Exception as e:
            print(f"Error in auto_cancel task: {e}")
        
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(auto_cancel_no_shows())
    yield
    task.cancel()

app = FastAPI(title='Reservation System API', lifespan=lifespan)

origins = settings.allowed_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    
    allow_credentials=True,    
    allow_methods=["*"],       
    allow_headers=["*"],       
)

app.include_router(users.router)
app.include_router(seats.router)
app.include_router(reservations.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API works perfectly"}