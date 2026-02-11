from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    favourites = relationship("Favourite", back_populates="user")

class Favourite(Base):
    __tablename__ = "favourites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    place_id = Column(String, index=True)
    place_name = Column(String)
    place_address = Column(String)
    place_rating = Column(String)
    place_price_level = Column(Integer)

    user = relationship("User", back_populates="favourites")
