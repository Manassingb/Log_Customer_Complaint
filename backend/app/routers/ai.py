import io
import email
import logging
from email import policy

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from groq import GroqError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.agents.graph import complaint_graph
from app.agents.nodes import chat_about_complaint

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)


def _extract_text_from_file(upload: UploadFile, raw_bytes: bytes) -> str:
    name = (upload.filename or "").lower()

    if name.endswith(".txt"):
        return raw_bytes.decode("utf-8", errors="ignore")

    if name.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if name.endswith(".docx"):
        import docx2txt
        with open("/tmp/_upload.docx", "wb") as f:
            f.write(raw_bytes)
        return docx2txt.process("/tmp/_upload.docx")

    if name.endswith(".eml"):
        msg = email.message_from_bytes(raw_bytes, policy=policy.default)
        body = msg.get_body(preferencelist=("plain",))
        return body.get_content() if body else ""

    # fallback: try plain decode
    return raw_bytes.decode("utf-8", errors="ignore")


def _run_extraction_pipeline(raw_text: str, db: Session) -> dict:
    try:
        existing = [
            {
                "batch_lot_number": c.batch_lot_number,
                "complaint_type": c.complaint_type,
                "detailed_description": c.detailed_description,
            }
            for c in db.query(models.Complaint).limit(50).all()
        ]
    except SQLAlchemyError:
        db.rollback()
        existing = []

    try:
        result = complaint_graph.invoke({
            "raw_text": raw_text,
            "existing_complaints": existing,
        })
    except GroqError as exc:
        logger.exception("Groq extraction pipeline failed")
        raise HTTPException(
            status_code=502,
            detail=f"AI provider error: {exc}",
        ) from exc

    return result


@router.post("/extract/file")
async def extract_from_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw_bytes = await file.read()
    if len(raw_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    text = _extract_text_from_file(file, raw_bytes)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the document")

    result = _run_extraction_pipeline(text, db)
    return _format_ai_result(result)


@router.post("/extract/text")
def extract_from_text(payload: schemas.ExtractTextRequest, db: Session = Depends(get_db)):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    result = _run_extraction_pipeline(payload.text, db)
    return _format_ai_result(result)


def _format_ai_result(result: dict) -> dict:
    extracted = result.get("extracted", {})
    return {
        "extracted_fields": extracted,
        "completeness_score": result.get("completeness_score"),
        "missing_fields": result.get("missing_fields"),
        "risk_classification": result.get("risk_classification"),
        "risk_rationale": result.get("risk_rationale"),
        "summary": result.get("summary"),
        "is_possible_duplicate": result.get("is_possible_duplicate"),
    }


@router.post("/chat")
def chat(payload: schemas.ChatRequest):
    reply = chat_about_complaint(payload.message, payload.complaint_context)
    return {"reply": reply}
