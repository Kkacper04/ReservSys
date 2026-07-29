from sqlalchemy.orm import Session
from models import Reservation
import schemas

def create_reservation(db: Session, reservation: schemas.ReservationCreate):
    collision_check = db.query(Reservation).filter(
        Reservation.seat_id == reservation.seat_id,
        Reservation.res_start_time < reservation.res_end_time,
        Reservation.res_end_time > reservation.res_start_time,
    ).first()

    if collision_check:
        raise ValueError("The seat is already reserved for the specified time window.")

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