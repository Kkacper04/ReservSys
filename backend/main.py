from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text 
from sqlalchemy.exc import IntegrityError

import models
import schemas
import crud
from database import get_db, engine, SessionLocal


models.base.metadata.create_all(bind=engine)

app = FastAPI(title='Reservation System API')


# @app.get("/")
# def read_root():
#     return {"status": "ok", "message": "works"}

# @app.get("/api/health")
# def health_check():
#     return {"status": "healthy"}

# @app.get("/api/db-check")
# def check_db_connection(db: Session = Depends(get_db)):
#     try:
#         db.execute(text("SELECT 1"))
#         return {"status": "ok", "message": "Database connection is healthy"}
#     except Exception as e:
#         return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@app.post("/api/reservations" , response_model=schemas.ReservationStatus)
def create_reservation (reservation: schemas.ReservationCreate, db: Session = Depends(get_db)):
    try:
        new_reservation = crud.create_reservation(db=db, reservation=reservation)

        if new_reservation is None:
            raise HTTPException(status_code=400, detail="The seat is already reserved for the specified time window.")
        return new_reservation
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Reservation could not be created. The seat may already be reserved for the specified time window.")

    return new_reservation

@app.post("/api/users", response_model=schemas.UserCreate)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/seats", response_model=schemas.SeatCreate)
def create_seat(seat: schemas.SeatCreate, db: Session = Depends(get_db)):
    db_seat = models.Seat(seat_number=seat.seat_number)
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat