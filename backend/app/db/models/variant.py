from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class ItemVariant(Base):
    """SKU / вариант товара (цвет/размер/прочее) с учётом остатка."""

    __tablename__ = "item_variants"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)

    size = Column(String(20), nullable=True, index=True)
    color = Column(String(30), nullable=True, index=True)
    sku = Column(String(50), nullable=True, unique=True, index=True)
    stock = Column(Integer, nullable=False, default=0)
    price = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    item = relationship("Item", back_populates="variants")
    cart_items = relationship("CartItem", back_populates="variant", cascade="all, delete-orphan") 