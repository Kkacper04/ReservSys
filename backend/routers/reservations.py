
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import models
import schemas, crud
from database import get_db
from routers.users import get_current_user
from routers.users import require_admin
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

@router.delete("/{reservation_id}/cancel", status_code=200)
def admin_cancel_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
   
    seat = db.query(models.Seat).filter(models.Seat.id == reservation.seat_id).first()
    
    reservation.status = models.ReservationStatus.CANCELLED # type: ignore
    
    
    notification_msg = f"Your reservation for seat {seat.seat_number} has been cancelled by the Administrator." # type: ignore
    
    new_notification = models.Notification(
        user_id=reservation.user_id,
        message=notification_msg
    )
    
    db.add(new_notification)
    db.commit()
    
    return {"message": "Reservation cancelled."}