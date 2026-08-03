from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker , declarative_base
from config import settings

sqlalchemy_database_url = settings.database_url
engine = create_engine(sqlalchemy_database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
base = declarative_base()

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()