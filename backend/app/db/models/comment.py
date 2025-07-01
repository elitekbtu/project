from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.db.models.associations import comment_likes

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=True, index=True)
    outfit_id = Column(Integer, ForeignKey("outfits.id", ondelete="CASCADE"), nullable=True, index=True)

    content = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 stars optional
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="comments")
    item = relationship("Item", back_populates="comments")
    outfit = relationship("Outfit", back_populates="comments")

    liked_by = relationship(
        "User",
        secondary=comment_likes,
        back_populates="liked_comments",
        lazy="dynamic",
    ) 