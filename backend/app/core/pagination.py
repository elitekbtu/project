from typing import Generic, TypeVar, List
from pydantic import BaseModel
from math import ceil

T = TypeVar('T')

PAGE_SIZE = 20


def get_pagination(page: int) -> tuple[int, int]:
    """Convert 1-based page number to skip & limit values.

    Args:
        page (int): Page number starting from 1.
    Returns:
        tuple[int, int]: (skip, limit) ready to pass to SQLAlchemy query.offset().limit().
    """
    if page < 1:
        page = 1
    skip = (page - 1) * PAGE_SIZE
    return skip, PAGE_SIZE


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    
    class Config:
        from_attributes = True

def paginate(query, page: int = 1, page_size: int = 20) -> dict:
    """
    Paginate a SQLAlchemy query
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:  # Limit max page size
        page_size = 100
        
    total = query.count()
    pages = ceil(total / page_size) if total > 0 else 1
    
    # Ensure page doesn't exceed total pages
    if page > pages:
        page = pages
    
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    
    return {
        'items': items,
        'total': total,
        'page': page,
        'size': page_size,
        'pages': pages,
        'has_next': page < pages,
        'has_prev': page > 1
    } 