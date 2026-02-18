import googlemaps
import os
from fastapi import APIRouter

gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
router = APIRouter(prefix="/map", tags=["map"])

@router.get("/nearby")
async def get_nearby(lat: float, lng: float, spot_type: str = "restaurant", cuisine: str = None):
    # Use Text Search (more flexible than Nearby) - better results
    query = f"{cuisine} {spot_type}s".strip() if cuisine else f"{spot_type}s"
    places_result = gmaps.places(
        query=query,
        location=(lat, lng),
        radius=5000,
        type=spot_type
    )
    results = _extract_places(places_result)
    # If cuisine filter returned nothing, retry without it
    if not results and cuisine:
        places_result = gmaps.places(
            query=f"{spot_type}s",
            location=(lat, lng),
            radius=5000,
            type=spot_type
        )
        results = _extract_places(places_result)
    return results

def _extract_places(places_result):
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

@router.get("/place-details/{place_id}")
async def get_place_details(place_id: str):
    place_details = gmaps.place(place_id=place_id, fields=['name', 'formatted_address', 'rating', 'price_level', 'geometry'])

    result = place_details.get('result', {})
    loc = result.get("geometry", {}).get("location", {})
    return {
        "place_id": place_id,
        "name": result.get("name"),
        "address": result.get("formatted_address"),
        "rating": result.get("rating"),
        "price_level": result.get("price_level"),
        "lat": loc.get("lat"),
        "lng": loc.get("lng")
    }
