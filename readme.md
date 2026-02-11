# Gourmet Map Project TODO

## 1. Setup Dependencies and Environment
- [x] Update requirements.txt with packages: fastapi, uvicorn, sqlalchemy, alembic, python-jose[cryptography], passlib[bcrypt], python-multipart, jinja2, python-dotenv
- [x] Create .env file for API keys and secrets
- [x] Set up database configuration (SQLite)

## 2. Database Models
- [x] Create app/models.py with User and Favourite models
- [x] Create app/database.py for database setup and session

## 3. Authentication
- [x] Implement register, login, logout endpoints in auth.py
- [x] Add JWT token creation and verification
- [x] Add dependency for current user

## 4. Enhanced Maps Service
- [x] Improve nearby endpoint in app/maps_servces.py to include more details
- [x] Add endpoint for place details
- [x] Add filtering by cuisine
- [x] Handle price levels

## 5. Favourites
- [x] Create app/api/favourites.py with add/remove/get favourites endpoints

## 6. Frontend (Mini-Map)
- [x] Create app/templates/ directory with HTML files (index.html, login.html, etc.)
- [x] Create app/static/ directory for CSS and JS
- [x] Implement Google Maps JS integration
- [x] Add login/register forms
- [x] Add favourites display

## 7. Main App
- [x] Update main.py to include all routers, database setup, templates, static files
- [x] Configure CORS if needed

## 8. Testing and Finalization
- [x] Run the app with uvicorn
- [ ] Test all endpoints
- [ ] Test frontend in browser
- [x] Ensure API key is set up properly (user needs to add their Google Maps API key to .env)
