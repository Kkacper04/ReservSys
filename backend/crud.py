from datetime import datetime
from sqlalchemy.orm import Session
from models import Reservation
import api_schemas
import models


def create_reservation(db: Session, reservation: api_schemas.ReservationCreate):
    if collision_check(db, reservation.seat_id, reservation.res_start_time, reservation.res_end_time):
        return "SEAT_UNAVAILABLE"
    if user_collision_check(db, reservation.user_id, reservation.res_start_time, reservation.res_end_time):
        return "OVERBOOKED"

    db_reservation = Reservation(
        user_id=reservation.user_id,
        seat_id=reservation.seat_id,
        res_start_time=reservation.res_start_time,
        res_end_time=reservation.res_end_time,
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation


def get_reservation(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Reservation).offset(skip).limit(limit).all()

def update_reservation_status(db: Session, reservation_id: int, new_status: models.ReservationStatus):
    db_reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if db_reservation:
        db_reservation.status = new_status
        db.commit()
        db.refresh(db_reservation)

    return db_reservation
    
def get_available_seats(db: Session, start_time: datetime, end_time: datetime):
    busy_seat_ids = (
        db.query(models.Reservation.seat_id)
        .filter(
            models.Reservation.res_start_time < end_time,
            models.Reservation.res_end_time > start_time,
            models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW])
        )
        .all()
    )
    reserved_ids = {row[0] for row in busy_seat_ids}

    all_seats = db.query(models.Seat).all()
    return [
        api_schemas.SeatResponse(id=seat.id,seat_number=seat.seat_number,is_available=seat.id not in reserved_ids,office_name=seat.office_name,zone=seat.zone,desk_type=seat.desk_type,has_monitor=seat.has_monitor,is_active=seat.is_active) #type: ignore
        for seat in all_seats
    ]
def collision_check(db: Session , seat_id : int,start_time : datetime, end_time : datetime):
    collision = db.query(models.Reservation).filter(
        models.Reservation.seat_id == seat_id,
        models.Reservation.res_start_time < end_time,
        models.Reservation.res_end_time > start_time,
        models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW])
    ).first()
    return collision
def user_collision_check(db: Session , user_id : int,start_time : datetime, end_time : datetime):
    collision = db.query(models.Reservation).filter(
        models.Reservation.user_id == user_id,
        models.Reservation.res_start_time < end_time,
        models.Reservation.res_end_time > start_time,
        models.Reservation.status.notin_([models.ReservationStatus.CANCELLED, models.ReservationStatus.NO_SHOW])
    ).first()
    return collision