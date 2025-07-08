from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from .item import Item
from app.db.models.associations import user_favorite_outfits

class OutfitItem(Base):
    __tablename__ = 'outfit_items'
    outfit_id = Column(Integer, ForeignKey('outfits.id', ondelete='CASCADE'), primary_key=True)
    item_id = Column(Integer, ForeignKey('items.id', ondelete='CASCADE'), primary_key=True)
    item_category = Column(String(50), nullable=False)

    item = relationship("Item")


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    style = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner = relationship("User", back_populates="outfits")
    outfit_items = relationship("OutfitItem", cascade="all, delete-orphan")

    liked_by = relationship(
        "User",
        secondary=user_favorite_outfits,
        back_populates="favorite_outfits",
        lazy="dynamic",
    )

    comments = relationship("Comment", back_populates="outfit", cascade="all, delete-orphan")

    @property
    def items(self):
        return {
            "tops": [oi.item for oi in self.outfit_items if oi.item_category == 'top'],
            "bottoms": [oi.item for oi in self.outfit_items if oi.item_category == 'bottom'],
            "footwear": [oi.item for oi in self.outfit_items if oi.item_category == 'footwear'],
            "accessories": [oi.item for oi in self.outfit_items if oi.item_category == 'accessory'],
            "fragrances": [oi.item for oi in self.outfit_items if oi.item_category == 'fragrance'],
        }

    @property
    def total_price(self):
        total = 0.0
        for oi in self.outfit_items:
            if oi.item.price:
                total += oi.item.price
        return total