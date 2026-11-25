from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator


class ReservationCreate(BaseModel):
    seat_id: int = Field(gt=0)
    res_start_time: datetime
    res_end_time: datetime
    recurrence_rule: Literal["daily", "weekly"] | None = None
    recurrence_end_date: datetime | None = None


class ReservationStatus(BaseModel):
    id: int
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime
    status: str = Field(default="pending")
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("status")
    def serialize_status(self, value: Any) -> str:
        if hasattr(value, "value"):
            return value.value
        return value


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("Username must be at least 2 characters.")
        return stripped

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes.")
        return value


class SeatCreate(BaseModel):
    seat_number: str = Field(min_length=1, max_length=20)
    zone: str = Field(min_length=1, max_length=50)
    desk_type: str = Field(min_length=1, max_length=30)
    office_name: str = Field(min_length=1, max_length=50)
    has_monitor: bool


class SeatOut(BaseModel):
    id: int
    seat_number: str
    zone: str
    desk_type: str
    office_name: str
    has_monitor: bool
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class ToggleSeatRequest(BaseModel):
    maintenance_start: datetime | None = None
    maintenance_end: datetime | None = None


class ReservationStatusUpdate(BaseModel):
    status: str


class SeatResponse(BaseModel):
    id: int
    seat_number: str
    is_available: bool
    zone: str
    desk_type: str
    office_name: str
    has_monitor: bool
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class NotificationResponse(BaseModel):
    id: int
    message: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message cannot be empty.")
        return stripped


class ChatResponse(BaseModel):
    reply: str
