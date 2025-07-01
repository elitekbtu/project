from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
import os, uuid

from app.db.models.user import User
from app.db.models.outfit import Outfit
from .schemas import ProfileUpdate
from app.db.models.preferences import Color, Brand

# Directory to store avatars
AVATAR_DIR = os.getenv("AVATAR_UPLOAD_DIR", "uploads/avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)


def get_profile(user: User):
    # Convert relationships into simple lists for pydantic output (handled in ProfileOut validators)
    return user


def update_profile(db: Session, user: User, profile_in: ProfileUpdate):
    update_data = profile_in.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data provided")

    # Helper to fetch/create preference entities
    def _get_or_create(model, name: str):
        # Normalize name: strip and collapse multiple spaces, keep case as-is for UI
        clean = name.strip()
        if not clean:
            return None
        instance = db.query(model).filter(model.name.ilike(clean)).first()
        if instance is None:
            instance = model(name=clean)
            db.add(instance)
            db.flush()  # get PK without committing yet
        return instance

    for field, value in update_data.items():
        if field in ("favorite_colors", "favorite_brands"):
            if value is None:
                setattr(user, field, [])
                continue

            # Accept both comma-separated string and an array from the client
            if isinstance(value, str):
                # Split by comma then strip
                value = [v.strip() for v in value.split(",") if v.strip()]

            if not isinstance(value, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field} must be an array of strings",
                )

            # Map plain strings to ORM objects
            model = Color if field == "favorite_colors" else Brand
            objects = []
            for name in value:
                if not isinstance(name, str):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Each {field[:-1]} must be a string",
                    )
                obj = _get_or_create(model, name)
                if obj is not None:
                    objects.append(obj)

            # Replace existing preference list
            setattr(user, field, objects)
        else:
            setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def delete_profile(db: Session, user: User):
    # The associated User object is what needs to be deleted.
    # Cascading deletes are configured on the User model relationships,
    # so deleting the user will correctly remove all their associated data
    # like outfits, cart items, favorites, etc.
    db.delete(user)
    db.commit()

    return None


def _save_avatar_file(upload: UploadFile) -> str:
    filename = f"{uuid.uuid4().hex}_{upload.filename}"
    path = os.path.join(AVATAR_DIR, filename)
    with open(path, "wb") as f:
        f.write(upload.file.read())
    return f"/uploads/avatars/{filename}"


def _remove_upload_file(url: str):
    if not url or not url.startswith("/uploads/"):
        return
    fs_path = url.lstrip("/").replace("/", os.sep)
    if os.path.exists(fs_path):
        try:
            os.remove(fs_path)
        except OSError:
            pass


def upload_avatar(db: Session, user: User, file: UploadFile):
    # Save new file
    url = _save_avatar_file(file)

    # remove old avatar if locally stored
    _remove_upload_file(user.avatar or "")

    user.avatar = url
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_avatar(db: Session, user: User):
    _remove_upload_file(user.avatar or "")
    user.avatar = None
    db.add(user)
    db.commit()
    return None 