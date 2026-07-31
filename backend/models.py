from sqlalchemy import CheckConstraint, Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from database import base


class ReservationStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

class User(base):
    __tablename__ = "users"

    id= Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    reservations = relationship("Reservation", back_populates="user")   # 1 user can have many reservations

class Seat(base):
    __tablename__ = "seats"

    id= Column(Integer, primary_key=True, index=True)
    seat_number = Column(String, unique=True, index=True, nullable=False)
    reservations = relationship("Reservation", back_populates="seat")   # 1 seat can have many reservations( few people can reserve the same seat for different films)

class Reservation(base):
    __tablename__= "reservations"

    id= Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=False)

    res_start_time : Mapped[datetime] = mapped_column(DateTime(timezone=True))
    res_end_time  : Mapped[datetime] = mapped_column(DateTime(timezone=True))

    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False)

    user = relationship("User", back_populates="reservations")  # many reservations can belong to 1 user
    seat = relationship("Seat", back_populates="reservations")  # many reservations can belong to 1 seat

    __table_args__ = (
        CheckConstraint('res_end_time > res_start_time', name='check_valid_time_window'),
    )

