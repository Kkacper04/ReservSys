from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
import schemas
import crud
from database import get_db, engine, SessionLocal


models.base.metadata.create_all(bind=engine)

app = FastAPI(title='Reservation System API')


# @app.get("/")
# def read_root():
#     return {"status": "ok", "message": "works"}

# @app.get("/api/health")
# def health_check():
#     return {"status": "healthy"}

# @app.get("/api/db-check")
# def check_db_connection(db: Session = Depends(get_db)):
#     try:
#         db.execute(text("SELECT 1"))
#         return {"status": "ok", "message": "Database connection is healthy"}
#     except Exception as e:
#         return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@app.post("/api/reservations" , response_model=schemas.ReservationStatus)
def create_reservation (reservation: schemas.ReservationCreate, db: Session = Depends(get_db)):
    new_reservation = crud.create_reservation(db=db, reservation=reservation)

    if new_reservation is None:
        raise HTTPException(status_code=400, detail="Reservation could not be created. The seat may already be reserved for the specified time window.")

    return new_reservation
