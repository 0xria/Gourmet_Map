from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Favourite, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/favourites", tags=["favourites"])

class FavSchema(BaseModel):
    place_id: str
    place_name: str
    place_address: str
    place_rating: float = None
    place_price_level: int = None

@router.post("/add")
async def add_fav(data: FavSchema, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_fav = Favourite(
        user_id=user.id,
        place_id=data.place_id,
        place_name=data.place_name,
        place_address=data.place_address,
        place_rating=str(data.place_rating),
        place_price_level=data.place_price_level
    )
    db.add(new_fav)
    db.commit()
    return {"status": "added"}

@router.get("/")
async def get_favourites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favourites = db.query(Favourite).filter(Favourite.user_id == current_user.id).all()
    return [
        {
            "id": f.id,
            "place_id": f.place_id,
            "name": f.place_name,
            "address": f.place_address,
            "rating": f.place_rating,
            "price_level": f.place_price_level
        }
        for f in favourites
    ]

@router.delete("/remove/{place_id}")
async def remove_favourite(
    place_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the specific favourite for THIS user
    favourite = db.query(Favourite).filter(
        Favourite.user_id == current_user.id,
        Favourite.place_id == place_id
    ).first()

    if not favourite:
        raise HTTPException(status_code=404, detail="Favourite not found")

    db.delete(favourite)
    db.commit()
    return {"message": "Removed from favourites"}
