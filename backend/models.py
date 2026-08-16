from sqlalchemy import Boolean, CheckConstraint, Column, Integer, String, ForeignKey, Enum, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
import enum
from database import base


class ReservationStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    CHECKED_IN = "checked_in"
    NO_SHOW = "no_show"

class User(base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="employee")  # role can be "employee" or "admin"
    reservations = relationship("Reservation", back_populates="user")   # 1 user can have many reservations
    notification = relationship("Notification", back_populates="user")  # 1 user can have many notifications


class Seat(base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    seat_number: Mapped[str] = mapped_column(String, index=True, nullable=False)
    # Additonal attributes for seat properties (ReservSys allows to rent cooworking spaces in the office)
    zone: Mapped[str] = mapped_column(String, nullable=False)
    office_name: Mapped[str] = mapped_column(String, nullable=False)
    desk_type: Mapped[str] = mapped_column(String, nullable=False)
    has_monitor: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True) #workspace working status, if the seat is broken or under maintenance, it will be marked as inactive and cannot be reserved

    reservations = relationship("Reservation", back_populates="seat")   # 1 seat can have many reservations(different people can reserve the same seat at different times)

class Reservation(base):
    __tablename__= "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), nullable=False)

    res_start_time : Mapped[datetime] = mapped_column(DateTime(timezone=True))
    res_end_time  : Mapped[datetime] = mapped_column(DateTime(timezone=True))

    status: Mapped[ReservationStatus] = mapped_column(Enum(ReservationStatus), default=ReservationStatus.PENDING)

    user = relationship("User", back_populates="reservations")  # many reservations can belong to 1 user
    seat = relationship("Seat", back_populates="reservations")  # many reservations can belong to 1 seat

    __table_args__ = (
        CheckConstraint('res_end_time > res_start_time', name='check_valid_time_window'),
    )
class Notification(base):
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notification")