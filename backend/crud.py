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
    
    