from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker , declarative_base
from sqlalchemy.engine import Engine
from sqlite3 import Connection as SQLite3Connection
from config import settings


sqlalchemy_database_url = settings.database_url
engine = create_engine(sqlalchemy_database_url)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
base = declarative_base()

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()