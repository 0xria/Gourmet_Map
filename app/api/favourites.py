from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from requests import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models import Favourite, User

router = APIRouter()

class FavSchema(BaseModel):
    place_id: str
    place_name: str
    place_address: str
    place_rating: Optional[float] = 0.0
    place_price_level: Optional[int] = 0

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
    return {"status": "success"}