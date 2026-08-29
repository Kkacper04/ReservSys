from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from api_schemas import SeatCreate, SeatResponse, ToggleSeatRequest
from models import Seat, User, Reservation, ReservationStatus, Notification
import crud
from database import get_db
from routers.users import require_admin

router = APIRouter(prefix="/api/seats", tags=["Seats"])

@router.post("/", response_model=SeatCreate)
def create_seat(seat: SeatCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_seat = Seat(
        seat_number=seat.seat_number,
        zone=seat.zone,
        office_name=seat.office_name,
        desk_type=seat.desk_type,
        has_monitor=seat.has_monitor
    )
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat

@router.get("/available", response_model=List[SeatResponse])
def check_available_seats(start_time: datetime, end_time: datetime, db: Session = Depends(get_db)):
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time.")
    return crud.get_available_seats(db, start_time, end_time)

@router.patch("/{seat_id}/toggle")
def toggle_seat_status(seat_id: int, request: ToggleSeatRequest | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
    
    if request and request.maintenance_start and request.maintenance_end:
        seat.is_active = False # type: ignore
        seat.maintenance_start = request.maintenance_start # type: ignore
        seat.maintenance_end = request.maintenance_end # type: ignore
        
        overlapping_res = db.query(Reservation).filter(
            Reservation.seat_id == seat_id,
            Reservation.res_start_time < request.maintenance_end,
            Reservation.res_end_time > request.maintenance_start,
            Reservation.status.notin_([ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW])
        ).all()
        
        for res in overlapping_res:
            res.status = ReservationStatus.CANCELLED # type: ignore
            notif = Notification(
                user_id=res.user_id,
                message=f"Your reservation for seat {seat.seat_number} from {res.res_start_time.strftime('%Y-%m-%d %H:%M')} to {res.res_end_time.strftime('%H:%M')} was cancelled due to unexpected maintenance."
            )
            db.add(notif)
    else:
        seat.is_active = not seat.is_active  # type: ignore
        if seat.is_active:
            seat.maintenance_start = None # type: ignore
            seat.maintenance_end = None # type: ignore

    db.commit()
    return {"message": "Status has been changed", "is_active": seat.is_active}