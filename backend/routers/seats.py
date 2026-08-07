from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import schemas, crud, models
from database import get_db

router = APIRouter(prefix="/api/seats", tags=["Seats"])

@router.post("/", response_model=schemas.SeatCreate)
def create_seat(seat: schemas.SeatCreate, db: Session = Depends(get_db)):
    db_seat = models.Seat(seat_number=seat.seat_number)
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat

@router.get("/available", response_model=List[schemas.SeatResponse])
def check_available_seats(start_time: datetime, end_time: datetime, db: Session = Depends(get_db)):
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time.")
    return crud.get_available_seats(db, start_time, end_time)