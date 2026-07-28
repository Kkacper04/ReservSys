from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db


app = FastAPI(title='Reservation System API')


@app.get("/")
def read_root():
    return {"status": "ok", "message": "works"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/db-check")
def check_db_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database connection is healthy"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}
