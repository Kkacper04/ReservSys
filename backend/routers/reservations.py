
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from models import Reservation, Seat, Notification, ReservationStatus as ModelReservationStatus, User
from api_schemas import ReservationCreate, ReservationStatus as SchemaReservationStatus, UserResponse
import crud
from database import get_db
from routers.users import get_current_user
from routers.users import require_admin
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/reservations", tags=["Reservations"])

@router.post("/", response_model=SchemaReservationStatus)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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

@router.get("/", response_model=List[SchemaReservationStatus])
def read_reservations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return crud.get_reservation(db=db, skip=skip, limit=limit)

@router.delete("/{reservation_id}/cancel", status_code=200)
def admin_cancel_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
   
    seat = db.query(Seat).filter(Seat.id == reservation.seat_id).first()
    
    reservation.status = ModelReservationStatus.CANCELLED # type: ignore
    
    
    notification_msg = f"Your reservation for seat {seat.seat_number} has been cancelled by the Administrator." # type: ignore
    
    new_notification = Notification(
        user_id=reservation.user_id,
        message=notification_msg
    )
    
    db.add(new_notification)
    db.commit()
    
    return {"message": "Reservation cancelled."}

@router.get("/my", response_model=List[SchemaReservationStatus])
def get_my_reservations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Reservation).filter(
        Reservation.user_id == current_user.id
    ).all()

@router.patch("/{reservation_id}/my-cancel", status_code=200)
def user_cancel_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.user_id == current_user.id
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.status == ModelReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation is already cancelled")

    reservation.status = ModelReservationStatus.CANCELLED  # type: ignore
    db.commit()

    return {"message": "Reservation cancelled successfully."}

@router.patch("/{reservation_id}/checkin", status_code=200)
def checkin_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.user_id == current_user.id
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.status != ModelReservationStatus.CONFIRMED and reservation.status != ModelReservationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending or confirmed reservations can be checked in.")

    now = datetime.now(timezone.utc)
    res_start = reservation.res_start_time
    
    window_start = res_start - timedelta(minutes=15)
    window_end = res_start + timedelta(minutes=15)

    if now < window_start:
        raise HTTPException(status_code=400, detail="Too early to check in. Check-in opens 15 minutes before your reservation.")
    if now > window_end:
        raise HTTPException(status_code=400, detail="Too late to check in. Your reservation has expired.")

    reservation.status = ModelReservationStatus.CHECKED_IN # type: ignore
    db.commit()

    return {"message": "Checked in successfully."}