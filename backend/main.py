from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import users, seats, reservations
from config import settings

models.base.metadata.create_all(bind=engine)

app = FastAPI(title='Reservation System API')

origins = settings.allowed_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    
    allow_credentials=True,    
    allow_methods=["*"],       
    allow_headers=["*"],       
)

app.include_router(users.router)
app.include_router(seats.router)
app.include_router(reservations.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API works perfectly"}