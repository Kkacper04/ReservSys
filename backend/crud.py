from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from database import to_utc
from models import Reservation
import api_schemas
import models


def create_reservation(db: Session, reservation: api_schemas.ReservationCreate, user_id: int):
    start_utc = to_utc(reservation.res_start_time)
    end_utc = to_utc(reservation.res_end_time)

    if collision_check(db, reservation.seat_id, start_utc, end_utc):
        return "SEAT_UNAVAILABLE"
    if user_collision_check(db, user_id, start_utc, end_utc):
        return "OVERBOOKED"

    db_reservation = Reservation(
        user_id=user_id,
        seat_id=reservation.seat_id,
        res_start_time=start_utc,
        res_end_time=end_utc,
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation


def get_reservation(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Reservation)
        .options(joinedload(Reservation.user), joinedload(Reservation.seat))
        .order_by(Reservation.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_reservation_by_id(db: Session, reservation_id: int):
    return (
        db.query(Reservation)
        .options(joinedload(Reservation.user), joinedload(Reservation.seat))
        .filter(Reservation.id == reservation_id)
        .first()
    )


def update_reservation_status(db: Session, reservation_id: int, new_status: models.ReservationStatus):
    db_reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if db_reservation:
        db_reservation.status = new_status
        db.commit()
        db.refresh(db_reservation)

    return db_reservation


def get_available_seats(db: Session, start_time: datetime, end_time: datetime):
    start_utc = to_utc(start_time)
    end_utc = to_utc(end_time)

    busy_seat_ids = (
        db.query(models.Reservation.seat_id)
        .filter(
            models.Reservation.res_start_time < end_utc,
            models.Reservation.res_end_time > start_utc,
            models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW]),
        )
        .all()
    )
    reserved_ids = {row[0] for row in busy_seat_ids}

    all_seats = db.query(models.Seat).order_by(models.Seat.id.asc()).all()
    response = []
    for seat in all_seats:
        is_active_for_period = seat.is_active
        if seat.maintenance_start and seat.maintenance_end:
            m_start = to_utc(seat.maintenance_start)
            m_end = to_utc(seat.maintenance_end)
            if start_utc < m_end and end_utc > m_start:
                is_active_for_period = False

        response.append(
            api_schemas.SeatResponse(
                id=seat.id,
                seat_number=seat.seat_number,
                is_available=seat.id not in reserved_ids,
                office_name=seat.office_name,
                zone=seat.zone,
                desk_type=seat.desk_type,
                has_monitor=seat.has_monitor,
                is_active=is_active_for_period,
            )
        )
    return response


def collision_check(db: Session, seat_id: int, start_time: datetime, end_time: datetime):
    start_utc = to_utc(start_time)
    end_utc = to_utc(end_time)

    seat = db.query(models.Seat).filter(models.Seat.id == seat_id).with_for_update().first()
    if not seat or not seat.is_active:
        return True
    if seat.maintenance_start and seat.maintenance_end:
        m_start = to_utc(seat.maintenance_start)
        m_end = to_utc(seat.maintenance_end)
        if start_utc < m_end and end_utc > m_start:
            return True

    collision = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.seat_id == seat_id,
            models.Reservation.res_start_time < end_utc,
            models.Reservation.res_end_time > start_utc,
            models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW]),
        )
        .first()
    )
    return collision


def user_collision_check(db: Session, user_id: int, start_time: datetime, end_time: datetime):
    start_utc = to_utc(start_time)
    end_utc = to_utc(end_time)

    collision = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.user_id == user_id,
            models.Reservation.res_start_time < end_utc,
            models.Reservation.res_end_time > start_utc,
            models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW]),
        )
        .first()
    )
    return collision
