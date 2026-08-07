from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import schemas, crud, models
from database import get_db

router = APIRouter(prefix="/api/seats", tags=["Seats"])

@router.post("/", response_model=schemas.SeatCreate)
def create_seat(seat: schemas.SeatResponse, db: Session = Depends(get_db)):
    db_seat = models.Seat(seat_number=seat.seat_number)
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat

@router.get("/available", response_model=List[schemas.SeatResponse])
def check_available_seats(start_time: datetime, end_time: datetime, db: Session = Depends(get_db)):
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time.")
    all_seats = db.query(models.Seat).all()
    overlapping_reservations = db.query(models.Reservation).filter(
        models.Reservation.res_start_time < end_time,
        models.Reservation.res_end_time > start_time
    ).all()

    reserved_seat_ids = {reservation.seat_id for reservation in overlapping_reservations}

    seats_response = []
    for seat in all_seats:
        seats_response.append({
            "id": seat.id,
            "seat_number": seat.seat_number,
            "is_available": seat.id not in reserved_seat_ids
        })

    
    
    return seats_response