from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api_schemas import SeatCreate, SeatOut, SeatResponse, ToggleSeatRequest
import crud
from database import get_db, to_utc
from models import Notification, Reservation, ReservationStatus, Seat, User
from routers.users import require_admin

router = APIRouter(prefix="/api/seats", tags=["Seats"])


@router.post("/", response_model=SeatOut, status_code=status.HTTP_201_CREATED)
def create_seat(seat: SeatCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = (
        db.query(Seat)
        .filter(Seat.office_name == seat.office_name, Seat.seat_number == seat.seat_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Seat already exists in this office.")

    db_seat = Seat(
        seat_number=seat.seat_number,
        zone=seat.zone,
        office_name=seat.office_name,
        desk_type=seat.desk_type,
        has_monitor=seat.has_monitor,
    )
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat


@router.get("/available", response_model=List[SeatResponse])
def check_available_seats(start_time: datetime, end_time: datetime, db: Session = Depends(get_db)):
    start_utc = to_utc(start_time)
    end_utc = to_utc(end_time)
    if start_utc >= end_utc:
        raise HTTPException(status_code=400, detail="Start time must be before end time.")
    return crud.get_available_seats(db, start_utc, end_utc)


@router.patch("/{seat_id}/toggle")
def toggle_seat_status(
    seat_id: int,
    request: ToggleSeatRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")

    if request and (request.maintenance_start is not None or request.maintenance_end is not None):
        if request.maintenance_start is None or request.maintenance_end is None:
            raise HTTPException(status_code=400, detail="Both maintenance_start and maintenance_end are required.")
        m_start = to_utc(request.maintenance_start)
        m_end = to_utc(request.maintenance_end)
        if m_start >= m_end:
            raise HTTPException(status_code=400, detail="Maintenance start must be before maintenance end.")

        seat.is_active = False
        seat.maintenance_start = m_start
        seat.maintenance_end = m_end

        overlapping_res = (
            db.query(Reservation)
            .filter(
                Reservation.seat_id == seat_id,
                Reservation.res_start_time < m_end,
                Reservation.res_end_time > m_start,
                Reservation.status.notin_([ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW]),
            )
            .all()
        )

        for res in overlapping_res:
            res.status = ReservationStatus.CANCELLED
            res_start_str = to_utc(res.res_start_time).strftime("%Y-%m-%d %H:%M")
            res_end_str = to_utc(res.res_end_time).strftime("%H:%M")
            notif = Notification(
                user_id=res.user_id,
                message=(
                    f"Your reservation for seat {seat.seat_number} from "
                    f"{res_start_str} to {res_end_str} was cancelled due to unexpected maintenance."
                ),
            )
            db.add(notif)
    else:
        seat.is_active = not seat.is_active
        if seat.is_active:
            seat.maintenance_start = None
            seat.maintenance_end = None

    db.commit()
    return {"message": "Status has been changed", "is_active": seat.is_active}
