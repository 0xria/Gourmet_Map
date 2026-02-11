import googlemaps
import os
from fastapi import APIRouter, Depends, Query
from app.api.auth import get_current_user

gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
router = APIRouter(prefix="/map", tags=["map"])

@router.get("/nearby")
async def get_nearby(lat: float, lng: float, cuisine: str = None, current_user=Depends(get_current_user)):
    # Keyword search is better for 'accents' like "Nigerian" or "Italian"
    places_result = gmaps.places_nearby(
        location=(lat, lng),
        radius=2000,
        type='restaurant',
        keyword=cuisine
    )

    results = []
    for p in places_result.get('results', []):
        loc = p.get("geometry", {}).get("location", {})
        results.append({
            "place_id": p.get("place_id"),
            "name": p.get("name"),
            "lat": loc.get("lat"),
            "lng": loc.get("lng"),
            "price_level": p.get("price_level"),
            "rating": p.get("rating"),
            "address": p.get("vicinity")
        })
    return results