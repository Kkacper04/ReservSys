from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker , declarative_base

sqlalchemy_database_url = "postgresql://admin:admin@localhost:5432/reservation_system"
engine = create_engine(sqlalchemy_database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
base = declarative_base()

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()