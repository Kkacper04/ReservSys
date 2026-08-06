from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class ReservationCreate(BaseModel):
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime

class ReservationStatus(BaseModel):
    id: int
    user_id: int
    seat_id: int
    res_start_time: datetime
    res_end_time: datetime
    status: str = Field(default="pending", description="Reservation status") 
    model_config = ConfigDict(from_attributes=True)  

class UserCreate(BaseModel):
     name: str
     email: str

class SeatCreate(BaseModel):
     seat_number: str

class ReservationStatusUpdate(BaseModel):
     status : str

class SeatResponse(BaseModel):
     id: int
     seat_number: str
     model_config = ConfigDict(from_attributes=True)  

class UserResponse(BaseModel):
     id: int
     name: str
     email: str
     model_config = ConfigDict(from_attributes=True)  
