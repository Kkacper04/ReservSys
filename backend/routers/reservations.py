from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api_schemas import AdminReservationResponse, ReservationCreate, ReservationStatus as SchemaReservationStatus
import crud
from database import get_db, to_utc
from models import Notification, Reservation, ReservationStatus as ModelReservationStatus, Seat, User
from routers.users import get_current_user, require_admin

router = APIRouter(prefix="/api/reservations", tags=["Reservations"])

MAX_RESERVATION_HOURS = 16
MAX_RECURRENCES = 30
CHECKIN_WINDOW_MINUTES = 15


@router.post("/", response_model=List[SchemaReservationStatus])
def create_reservation(
    reservation: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_utc = to_utc(reservation.res_start_time)
    end_utc = to_utc(reservation.res_end_time)
    now_utc = datetime.now(timezone.utc)

    if start_utc < now_utc:
        raise HTTPException(status_code=400, detail="Reservation start time must be in the future.")
    if start_utc >= end_utc:
        raise HTTPException(status_code=400, detail="Reservation end time must be after the start time.")
    if (end_utc - start_utc).total_seconds() > MAX_RESERVATION_HOURS * 3600:
        raise HTTPException(status_code=400, detail="Single reservation cannot exceed 16 hours.")

    if reservation.recurrence_rule and not reservation.recurrence_end_date:
        raise HTTPException(status_code=400, detail="Recurrence end date is required when recurrence rule is set.")
    if reservation.recurrence_end_date and not reservation.recurrence_rule:
        raise HTTPException(status_code=400, detail="Recurrence rule is required when recurrence end date is set.")

    dates_to_book = []
    current_start = start_utc
    current_end = end_utc

    if reservation.recurrence_rule and reservation.recurrence_end_date:
        recurrence_end_utc = to_utc(reservation.recurrence_end_date)
        if recurrence_end_utc < current_start:
            raise HTTPException(status_code=400, detail="Recurrence end date must be after the start date.")

        step = timedelta(days=1) if reservation.recurrence_rule == "daily" else timedelta(weeks=1)
        while current_start <= recurrence_end_utc:
            if len(dates_to_book) >= MAX_RECURRENCES:
                raise HTTPException(status_code=400, detail=f"Maximum allowed recurrences is {MAX_RECURRENCES}.")
            dates_to_book.append((current_start, current_end))
            current_start += step
            current_end += step
    else:
        dates_to_book.append((current_start, current_end))

    seat = db.query(Seat).filter(Seat.id == reservation.seat_id).with_for_update().first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found.")
    if not seat.is_active:
        raise HTTPException(status_code=400, detail="Seat is currently out of service.")

    for start, end in dates_to_book:
        if crud.collision_check(db, reservation.seat_id, start, end):
            raise HTTPException(status_code=400, detail=f"The seat is unavailable on {start.strftime('%Y-%m-%d %H:%M')}.")
        if crud.user_collision_check(db, current_user.id, start, end):
            raise HTTPException(
                status_code=400,
                detail=f"You already have a reservation overlapping on {start.strftime('%Y-%m-%d %H:%M')}.",
            )

    created_reservations = []
    try:
        for start, end in dates_to_book:
            new_res = Reservation(
                user_id=current_user.id,
                seat_id=reservation.seat_id,
                res_start_time=start,
                res_end_time=end,
            )
            db.add(new_res)
            created_reservations.append(new_res)
        db.commit()
        for res in created_reservations:
            db.refresh(res)
        return created_reservations
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database error.")


@router.get("/", response_model=List[AdminReservationResponse])
def read_reservations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return crud.get_reservation(db=db, skip=skip, limit=limit)


@router.delete("/{reservation_id}/cancel", status_code=200)
def admin_cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status == ModelReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation is already cancelled")

    seat = db.query(Seat).filter(Seat.id == reservation.seat_id).first()
    seat_label = seat.seat_number if seat else str(reservation.seat_id)

    reservation.status = ModelReservationStatus.CANCELLED
    new_notification = Notification(
        user_id=reservation.user_id,
        message=f"Your reservation for seat {seat_label} has been cancelled by the Administrator.",
    )
    db.add(new_notification)
    db.commit()
    return {"message": "Reservation cancelled."}


@router.get("/my", response_model=List[SchemaReservationStatus])
def get_my_reservations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Reservation)
        .filter(Reservation.user_id == current_user.id)
        .order_by(Reservation.res_start_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{reservation_id}", response_model=AdminReservationResponse)
def read_reservation_by_id(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    reservation = crud.get_reservation_by_id(db=db, reservation_id=reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.patch("/{reservation_id}/my-cancel", status_code=200)
def user_cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.status == ModelReservationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Reservation is already cancelled")
    if reservation.status not in (ModelReservationStatus.PENDING, ModelReservationStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail="Only pending or confirmed reservations can be cancelled.")

    reservation.status = ModelReservationStatus.CANCELLED
    db.commit()
    return {"message": "Reservation cancelled successfully."}


@router.patch("/{reservation_id}/checkin", status_code=200)
def checkin_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.status not in (ModelReservationStatus.CONFIRMED, ModelReservationStatus.PENDING):
        raise HTTPException(status_code=400, detail="Only pending or confirmed reservations can be checked in.")

    now = datetime.now(timezone.utc)
    res_start = to_utc(reservation.res_start_time)

    window_start = res_start - timedelta(minutes=CHECKIN_WINDOW_MINUTES)
    window_end = res_start + timedelta(minutes=CHECKIN_WINDOW_MINUTES)

    if now < window_start:
        raise HTTPException(
            status_code=400,
            detail="Too early to check in. Check-in opens 15 minutes before your reservation.",
        )
    if now > window_end:
        raise HTTPException(status_code=400, detail="Too late to check in. Your reservation has expired.")

    reservation.status = ModelReservationStatus.CHECKED_IN
    db.commit()
    return {"message": "Checked in successfully."}
