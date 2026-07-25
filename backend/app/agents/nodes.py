import json
from typing import TypedDict, Optional, List

from groq import Groq

from app.config import settings

client = Groq(api_key=settings.groq_api_key)


class ComplaintState(TypedDict, total=False):
    raw_text: str
    extracted: dict
    completeness_score: float
    missing_fields: List[str]
    risk_classification: str
    risk_rationale: str
    summary: str
    is_possible_duplicate: bool
    existing_complaints: List[dict]
    chat_reply: Optional[str]


EXTRACTION_FIELDS = [
    "complaint_source", "customer_name", "product_name", "product_strength",
    "batch_lot_number", "manufacturing_date", "expiry_date", "quantity_affected",
    "complaint_type", "complaint_date", "detailed_description",
]


def _call_groq(model: str, system: str, user: str, json_mode: bool = True) -> str:
    kwargs = dict(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content


def extract_details(state: ComplaintState) -> ComplaintState:
    system = (
        "You are a pharmaceutical QMS complaint intake assistant. Extract structured "
        "fields from the raw complaint text (email, PDF text, or free text). "
        f"Return ONLY a JSON object with these keys: {EXTRACTION_FIELDS}. "
        "Use null for anything not mentioned. Dates must be YYYY-MM-DD or null. "
        "quantity_affected must be a number or null."
    )
    raw = _call_groq(settings.groq_extraction_model, system, state["raw_text"])
    try:
        extracted = json.loads(raw)
    except json.JSONDecodeError:
        extracted = {f: None for f in EXTRACTION_FIELDS}
    state["extracted"] = extracted
    return state


def check_completeness(state: ComplaintState) -> ComplaintState:
    extracted = state.get("extracted", {})
    missing = [f for f in EXTRACTION_FIELDS if not extracted.get(f)]
    score = round((len(EXTRACTION_FIELDS) - len(missing)) / len(EXTRACTION_FIELDS) * 100, 1)
    state["completeness_score"] = score
    state["missing_fields"] = missing
    return state


def classify_risk(state: ComplaintState) -> ComplaintState:
    system = (
        "You are a pharmaceutical quality risk classifier (per ICH Q9 style thinking). "
        "Given complaint details, classify risk as one of: Critical, Major, Minor. "
        "Critical = patient safety / adverse event / potential recall. "
        "Major = product quality defect impacting efficacy/GMP but no direct safety signal. "
        "Minor = cosmetic, packaging, labeling, or service issue with no quality impact. "
        'Return ONLY JSON: {"risk_classification": "...", "rationale": "1-2 sentence reason"}'
    )
    user = json.dumps(state.get("extracted", {}))
    raw = _call_groq(settings.groq_context_model, system, user)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"risk_classification": "Minor", "rationale": "Unable to classify confidently; defaulted to Minor for manual review."}
    state["risk_classification"] = parsed.get("risk_classification", "Minor")
    state["risk_rationale"] = parsed.get("rationale", "")
    return state


def summarize_complaint(state: ComplaintState) -> ComplaintState:
    system = (
        "Summarize the following pharmaceutical customer complaint in 2-3 concise, "
        "professional sentences suitable for a QA reviewer. Return ONLY JSON: "
        '{"summary": "..."}'
    )
    user = json.dumps(state.get("extracted", {}))
    raw = _call_groq(settings.groq_context_model, system, user)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"summary": state.get("extracted", {}).get("detailed_description", "")}
    state["summary"] = parsed.get("summary", "")
    return state


def check_duplicate(state: ComplaintState) -> ComplaintState:
    existing = state.get("existing_complaints", [])
    extracted = state.get("extracted", {})
    if not existing:
        state["is_possible_duplicate"] = False
        return state
    system = (
        "You check whether a NEW complaint is likely a duplicate of any EXISTING complaint "
        "(same batch/lot number and same/similar issue description). "
        'Return ONLY JSON: {"is_duplicate": true/false}'
    )
    user = json.dumps({"new_complaint": extracted, "existing_complaints": existing})
    raw = _call_groq(settings.groq_context_model, system, user)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"is_duplicate": False}
    state["is_possible_duplicate"] = bool(parsed.get("is_duplicate", False))
    return state


def chat_about_complaint(message: str, context: dict) -> str:
    system = (
        "You are an AI assistant embedded in a pharmaceutical complaint intake form. "
        "Answer the user's question using the complaint context provided. Be concise "
        "and professional. If unsure, say so and suggest manual review."
    )
    user = f"Complaint context: {json.dumps(context or {})}\n\nQuestion: {message}"
    return _call_groq(settings.groq_context_model, system, user, json_mode=False)
