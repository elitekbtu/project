from sqlalchemy import Column, Integer, String, Boolean, Date, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.db.models.associations import user_favorite_items, UserView, user_favorite_colors, user_favorite_brands
from app.db.models.preferences import Color, Brand


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_moderator = Column(Boolean, default=False)
    avatar = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True, unique=True, index=True)
    date_of_birth = Column(Date, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chest = Column(Float, nullable=True)
    waist = Column(Float, nullable=True)
    hips = Column(Float, nullable=True)

    favorite_colors = relationship("Color", secondary=user_favorite_colors)
    favorite_brands = relationship("Brand", secondary=user_favorite_brands)

    favorites = relationship(
        "Item",
        secondary=user_favorite_items,
        back_populates="liked_by",
        lazy="dynamic",
    )

    view_history = relationship("UserView", back_populates="user", cascade="all, delete-orphan")

    outfits = relationship("Outfit", cascade="all, delete-orphan", back_populates="owner")

    favorite_outfits = relationship(
        "Outfit",
        secondary="user_favorite_outfits",
        back_populates="liked_by",
        lazy="dynamic",
    )

    outfit_view_history = relationship("OutfitView", back_populates="user", cascade="all, delete-orphan")

    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")

    liked_comments = relationship(
        "Comment",
        secondary="comment_likes",
        back_populates="liked_by",
        lazy="dynamic",
    )

    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan", lazy="dynamic") 
    # Items created by this user (e.g., moderators)
    items = relationship("Item", back_populates="owner", cascade="all, delete-orphan") 