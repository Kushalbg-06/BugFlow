import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.activity import log_activity
from app.models.issue import Issue
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.attachment import AttachmentOut

router = APIRouter(prefix="/issues/{issue_id}/attachments", tags=["attachments"])

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.get("", response_model=List[AttachmentOut])
def list_attachments(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Issue).filter(Issue.id == issue_id).first():
        raise HTTPException(status_code=404, detail="Issue not found")
    return db.query(Attachment).filter(Attachment.issue_id == issue_id).order_by(Attachment.created_at.desc()).all()

@router.post("", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    issue_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    issue_dir = os.path.join(UPLOAD_ROOT, str(issue_id))
    os.makedirs(issue_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    stored_path = os.path.join(issue_dir, safe_name)
    with open(stored_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        issue_id=issue_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(contents),
        stored_path=stored_path,
    )
    db.add(attachment)
    db.flush()
    log_activity(db, issue_id, current_user.id, "attachment_added", file.filename)
    db.commit()
    db.refresh(attachment)
    return attachment

@router.get("/{attachment_id}/download")
def download_attachment(issue_id: int, attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.issue_id == issue_id).first()
    if not attachment or not os.path.exists(attachment.stored_path):
        raise HTTPException(status_code=404, detail="Attachment not found")
    return FileResponse(attachment.stored_path, filename=attachment.filename, media_type=attachment.content_type)
