from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer
from datetime import datetime
from typing import Any

class ReservationCreate(BaseModel):
    user_id: int = 0
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime
    recurrence_rule: str | None = None
    recurrence_end_date: datetime | None = None

class ReservationStatus(BaseModel):
    id: int
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime
    status: str = Field(default="pending")
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('status')
    def serialize_status(self, value: Any) -> str:
        if hasattr(value, 'value'):
            return value.value
        return value

class UserCreate(BaseModel):
     username: str
     email: str
     password: str

class SeatCreate(BaseModel):
     seat_number: str
     zone : str 
     desk_type : str
     office_name : str
     has_monitor : bool

class ToggleSeatRequest(BaseModel):
    maintenance_start: datetime | None = None
    maintenance_end: datetime | None = None

class ReservationStatusUpdate(BaseModel):
     status : str

class SeatResponse(BaseModel):
     id: int
     seat_number: str
     is_available: bool
     zone : str 
     desk_type : str
     office_name : str
     has_monitor : bool
     is_active : bool
     model_config = ConfigDict(from_attributes=True)  


class UserResponse(BaseModel):
     id: int
     name: str
     email: str
     role : str
     model_config = ConfigDict(from_attributes=True)  

class UserLogin(BaseModel):
     email: str
     password: str

class NotificationResponse(BaseModel):
     id: int
     message: str
     is_read: bool
     created_at: datetime
     model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
     message: str

class ChatResponse(BaseModel):
     reply: str