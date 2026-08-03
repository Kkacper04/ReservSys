from datetime import datetime
from sqlalchemy.orm import Session
from models import Reservation
import schemas
import models

def create_reservation(db: Session, reservation: schemas.ReservationCreate):
    collision_check = db.query(models.Reservation).filter(
        models.Reservation.seat_id == reservation.seat_id,
        models.Reservation.res_start_time < reservation.res_end_time,
        Reservation.res_end_time > reservation.res_start_time,
        Reservation.status != "cancelled"
    ).first()

    if collision_check:
        return None  # Indicate that the reservation could not be created due to a collision

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
    busy_reservations = db.query(models.Reservation.seat_id).filter(
        models.Reservation.res_start_time < end_time, #res. must start before the end time of the desired window
        models.Reservation.res_end_time > start_time, #res must end after the start time of the desired window 
        # for example 
        # We are looking for available seats from 10:00 to 12:00
        # Someone has a reservation from 09:00 to 11:00, so we have a collision
        # because 09:00 < 12:00 and 11:00 > 10:00
        models.Reservation.status != models.ReservationStatus.CANCELLED
    ).all()