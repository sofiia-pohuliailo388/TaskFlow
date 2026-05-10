import hashlib
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User

router = APIRouter(tags=["upload"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        raise HTTPException(status_code=503, detail="File upload is not configured on the server")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    timestamp = int(time.time())
    to_sign = f"timestamp={timestamp}"
    signature = hashlib.sha256(
        f"{to_sign}{settings.CLOUDINARY_API_SECRET}".encode()
    ).hexdigest()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload",
            data={
                "api_key": settings.CLOUDINARY_API_KEY,
                "timestamp": str(timestamp),
                "signature": signature,
            },
            files={"file": (file.filename, content, file.content_type or "application/octet-stream")},
        )

    if not response.is_success:
        detail = response.json().get("error", {}).get("message", "Upload failed")
        raise HTTPException(status_code=502, detail=detail)

    data = response.json()
    return {"url": data["secure_url"], "name": file.filename}
