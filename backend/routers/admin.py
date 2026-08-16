from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from routers.users import require_admin
import models

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    
    status_counts = db.query(
        models.Reservation.status, 
        func.count(models.Reservation.id)
    ).group_by(models.Reservation.status).all()
    
    status_stats = {status.value: count for status, count in status_counts}

    popular_seats = db.query(
        models.Seat.seat_number, 
        func.count(models.Reservation.id).label('reservation_count')
    ).join(models.Reservation, models.Seat.id == models.Reservation.seat_id).group_by(
        models.Seat.seat_number
    ).order_by(func.count(models.Reservation.id).desc()).limit(5).all()
    
    popular_seats_stats = [{"seat": seat, "count": count} for seat, count in popular_seats]

    zone_counts = db.query(
        models.Seat.office_name,
        models.Seat.zone,
        func.count(models.Reservation.id)
    ).join(models.Reservation, models.Seat.id == models.Reservation.seat_id).group_by(
        models.Seat.office_name, models.Seat.zone
    ).all()
    
    zone_stats = [{"office": office, "zone": zone, "count": count} for office, zone, count in zone_counts]

    return {
        "status_breakdown": status_stats,
        "popular_seats": popular_seats_stats,
        "zone_breakdown": zone_stats
    }
