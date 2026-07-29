from pydantic import BaseModel, Field
from datetime import datetime

class ReservationCreate(BaseModel):
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime

class ReservationStatus(BaseModel):
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime
    status: str = Field(default="pending", description="Reservation status") 

class Config:
        from_attributes = True