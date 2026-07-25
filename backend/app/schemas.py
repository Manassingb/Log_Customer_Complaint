from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel


class ComplaintBase(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity_affected: Optional[float] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[date] = None
    detailed_description: Optional[str] = None
    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintOut(ComplaintBase):
    id: str
    ai_summary: Optional[str] = None
    ai_risk_classification: Optional[str] = None
    ai_risk_rationale: Optional[str] = None
    is_possible_duplicate: Optional[str] = None
    completeness_score: Optional[float] = None
    missing_fields: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractTextRequest(BaseModel):
    text: str


class ChatRequest(BaseModel):
    message: str
    complaint_context: Optional[dict] = None
