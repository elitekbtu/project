from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.db.models.associations import user_favorite_items
from app.db.models.variant import ItemVariant

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    brand = Column(String(50), nullable=True, index=True)
    color = Column(String(30), nullable=True, index=True)
    size = Column(String(20), nullable=True, index=True)
    clothing_type = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True, index=True)
    category = Column(String(50), nullable=True, index=True)
    article = Column(String(50), nullable=True, index=True)
    style = Column(String(50), nullable=True, index=True)
    collection = Column(String(100), nullable=True, index=True)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    liked_by = relationship(
        "User",
        secondary=user_favorite_items,
        back_populates="favorites",
        lazy="dynamic",
    )

    comments = relationship("Comment", back_populates="item", cascade="all, delete-orphan")
    images = relationship("ItemImage", back_populates="item", cascade="all, delete-orphan")

    variants = relationship("ItemVariant", back_populates="item", cascade="all, delete-orphan")

    # Creator of the item (e.g., moderator or admin)
    owner = relationship("User", back_populates="items")

    @property
    def image_urls(self):
        """Helper to return list of image URLs for this item."""
        return [img.image_url for img in self.images] if self.images else []