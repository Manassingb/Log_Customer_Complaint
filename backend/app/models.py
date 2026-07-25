import uuid
import datetime

from sqlalchemy import Column, String, Text, Date, DateTime, Float, Enum
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=gen_uuid)

    # 1. Origin & customer details
    complaint_source = Column(String(255))
    customer_name = Column(String(255))

    # 2. Product & batch identification
    product_name = Column(String(255))
    product_strength = Column(String(255))
    batch_lot_number = Column(String(100))
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity_affected = Column(Float, nullable=True)

    # 3. Complaint details
    complaint_type = Column(String(100))
    complaint_date = Column(Date, nullable=True)
    detailed_description = Column(Text)

    # 4. Initial assessment & priority
    initial_severity = Column(String(50))
    priority = Column(String(50))

    # AI-generated fields
    ai_summary = Column(Text, nullable=True)
    ai_risk_classification = Column(String(50), nullable=True)
    ai_risk_rationale = Column(Text, nullable=True)
    is_possible_duplicate = Column(String(10), nullable=True)  # "yes"/"no"
    completeness_score = Column(Float, nullable=True)
    missing_fields = Column(Text, nullable=True)

    status = Column(String(50), default="pending_triage")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
