
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import models
import schemas, crud
from database import get_db
from routers.users import get_current_user
from routers.users import require_admin
from datetime import datetime

router = APIRouter(prefix="/api/reservations", tags=["Reservations"])

@router.post("/", response_model=schemas.ReservationStatus)
def create_reservation(reservation: schemas.ReservationCreate, db: Session = Depends(get_db), current_user: schemas.UserResponse = Depends(get_current_user)):
    reservation.user_id = current_user.id 
    now = datetime.now(reservation.res_start_time.tzinfo)  # Use the timezone of the reservation start time
    if reservation.res_start_time < now:
        raise HTTPException(status_code=400, detail="Reservation start time must be in the future.")
    if reservation.res_start_time >= reservation.res_end_time:
        raise HTTPException(status_code=400, detail="Reservation end time must be after the start time.")
    try:
        new_reservation = crud.create_reservation(db=db, reservation=reservation)
        if new_reservation == "SEAT_UNAVAILABLE":
            raise HTTPException(status_code=400, detail="The seat is already reserved for the specified time window.")
        if new_reservation == "OVERBOOKED":
            raise HTTPException(status_code=400, detail="You already have a reservation that overlaps with the specified time window.")
        if new_reservation is None:
            raise HTTPException(status_code=400, detail="The seat is already reserved for the specified time window.")
        return new_reservation
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database error.")

@router.get("/", response_model=List[schemas.ReservationStatus])
def read_reservations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
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

@router.get("/my", response_model=List[schemas.ReservationStatus])
def get_my_reservations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Reservation).filter(
        models.Reservation.user_id == current_user.id
    ).all()

@router.patch("/{reservation_id}/my-cancel", status_code=200)
def user_cancel_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    reservation = db.query(models.Reservation).filter(
        models.Reservation.id == reservation_id,
        models.Reservation.user_id == current_user.id
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.status == models.ReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation is already cancelled")

    reservation.status = models.ReservationStatus.CANCELLED  # type: ignore
    db.commit()

    return {"message": "Reservation cancelled successfully."}