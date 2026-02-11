from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
import os
from app.api import auth, favourites
from app import maps_services
from app.database import engine, Base
import jwt
import os
from fastapi.templating import Jinja2Templates


# 1. Get the directory where main.py is actually located
base_path = os.path.dirname(os.path.realpath(__file__))

# 2. Join it with the 'templates' folder name
templates_path = os.path.join(base_path, "templates")

# 3. Initialize Jinja2 with the absolute path
templates = Jinja2Templates(directory=templates_path)

# Debug line: Print this to your terminal to see where it's looking
print(f"DEBUG: Looking for templates in: {templates_path}")
# This finds the folder where main.py actually lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# This creates the full path to your templates folder
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates = Jinja2Templates(directory="templates")

# This creates the tables in Supabase automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gourmet Map")

app.include_router(auth.router)
app.include_router(favourites.router)
app.include_router(maps_services.router)

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "google_maps_api_key": os.getenv("GOOGLE_MAPS_API_KEY"),
        "current_user": None # We let JavaScript handle the user check now
    })