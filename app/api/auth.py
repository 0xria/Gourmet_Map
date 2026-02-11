from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

# Config
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Helper Functions ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user: raise HTTPException(status_code=401)
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid session")

# --- Routes ---
@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    hashed = get_password_hash(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    return {"message": "User created"}

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Wrong username/password")
    
    token = jwt.encode({"sub": user.username, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}