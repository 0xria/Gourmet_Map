from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
from app.models import User, Favourite  # Import models to create tables
from app.api import auth, favourites
from app import maps_services

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gourmet Map", description="Restaurant finder with Google Maps")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.include_router(auth.router)
app.include_router(favourites.router)
app.include_router(maps_services.router)

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "google_maps_api_key": os.getenv("GOOGLE_MAPS_API_KEY"),
        "current_user": None
    })

@app.get("/find-restaurants")
async def get_restaurants(location: str, cuisine_type: str):
    # Legacy endpoint, kept for compatibility
    import googlemaps
    gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
    places_result = gmaps.places(
        query=f"{cuisine_type} restaurants in {location}",
        type='restaurant'
    )
    return places_result.get('results')
