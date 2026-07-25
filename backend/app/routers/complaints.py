from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.get("/", response_model=List[schemas.ComplaintOut])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=schemas.ComplaintOut)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return obj


@router.post("/", response_model=schemas.ComplaintOut)
def create_complaint(payload: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    obj = models.Complaint(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{complaint_id}", response_model=schemas.ComplaintOut)
def update_complaint(complaint_id: str, payload: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Complaint not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{complaint_id}")
def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Complaint not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}
