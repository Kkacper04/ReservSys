from database import SessionLocal, engine
import models
import bcrypt
from config import settings

models.base.metadata.create_all(bind=engine)


def seed_database():
    db = SessionLocal()
    try:
        existing_seats = db.query(models.Seat).count()
        if existing_seats == 0:
            print("Generating seats...")
            rows = ["A", "B"]
            for row in rows:
                #office in Warsaw
                for number in range(1, 9):
                    has_mon = number % 2 == 0  
                    seat = models.Seat(seat_number=f"{row}{number}", zone="Open Space", office_name="Warsaw", desk_type="standard", has_monitor=has_mon)
                    db.add(seat)

            for number in range(1,9):
                seat = models.Seat(seat_number=f"C{number}", office_name="Warsaw", zone="Quiet Zone", desk_type="booth", has_monitor=True)
                db.add(seat)

            for number in range(1,5):
                seat= models.Seat(seat_number=f"D{number}", office_name="Warsaw", zone="Private Room", desk_type="private", has_monitor=False)
                db.add(seat)
            #Another office for example Poznan
            for number in range(1,7):
                seat = models.Seat(seat_number=f"C{number}", office_name="Poznan", zone="Quiet Zone", desk_type="booth", has_monitor=True)
                db.add(seat)

            for number in range(1,5):
                seat= models.Seat(seat_number=f"D{number}", office_name="Poznan", zone="Private Room", desk_type="private", has_monitor=False)
                db.add(seat)

            if not settings.admin_password:
                 raise ValueError("Set ADMIN_PASSWORD in .env")

            hashed_admin_pw = bcrypt.hashpw(settings.admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            
            admin_user = models.User(
                name="Main Administrator", 
                email="admin@gmail.com", 
                password=hashed_admin_pw, 
                role="admin"
            )
            db.add(admin_user)



            db.commit()
            print("Generated all seats successfully.")
        else:
            print(f"Seats already exist ({existing_seats}).")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()