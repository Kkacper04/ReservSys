from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas, models
from database import get_db


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user