
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import schemas, crud
from database import get_db
from routers.users import get_current_user

router = APIRouter(prefix="/api/reservations", tags=["Reservations"])

@router.post("/", response_model=schemas.ReservationStatus)
def create_reservation(reservation: schemas.ReservationCreate, db: Session = Depends(get_db), current_user: schemas.UserResponse = Depends(get_current_user)):
    reservation.user_id = current_user.id 
    try:
        new_reservation = crud.create_reservation(db=db, reservation=reservation)
        if new_reservation is None:
            raise HTTPException(status_code=400, detail="The seat is already reserved for the specified time window.")
        return new_reservation
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database error.")

@router.get("/", response_model=List[schemas.ReservationStatus])
def read_reservations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_reservation(db=db, skip=skip, limit=limit)