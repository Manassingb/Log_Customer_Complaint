# AI-Powered Customer Complaint Management System

AIVOA – Round 1 Full Stack Developer Assessment. A pharmaceutical (API & FDF) quality
complaint intake system: a manual complaint form on the left, and an AI assistant on the
right that reads an uploaded document/email/pasted text, auto-extracts structured fields,
scores completeness, classifies risk, flags possible duplicates, and summarizes the
complaint — powered by a LangGraph agent calling Groq LLMs.

## Tech stack (as mandated)
- **Frontend:** React + Redux Toolkit
- **Backend:** Python, FastAPI
- **AI Agent Framework:** LangGraph
- **LLMs:** Groq — `openai/gpt-oss-20b` for extraction, `openai/gpt-oss-120b` for
  risk classification / summarization / duplicate check / chat
- **Database:** PostgreSQL (works with MySQL too — just change `DATABASE_URL`)
- **Font:** Google Inter

## Project structure
```
complaint-mgmt/
  backend/
    app/
      agents/
        nodes.py     # individual LangGraph node functions (extract, completeness,
                      # risk classify, summarize, duplicate check, chat)
        graph.py      # StateGraph wiring the pipeline together
      routers/
        complaints.py # CRUD for saved complaints
        ai.py          # file/text upload -> extraction pipeline, chat endpoint
      main.py, config.py, database.py, models.py, schemas.py
    requirements.txt
    .env.example
  frontend/
    src/
      components/ComplaintForm.jsx   # left panel (manual form)
      components/AIAssistant.jsx     # right panel (upload/paste + chat)
      store/                          # Redux Toolkit slice + store
      api.js
  sample-data/sample_complaint_1.txt  # demo complaint text
```

## LangGraph pipeline
`extract_details → check_completeness → classify_risk → summarize_complaint → check_duplicate`

Each stage is a node that reads/writes a shared `ComplaintState` dict:
1. **extract_details** — Groq (`openai/gpt-oss-20b`), JSON-mode prompt pulls the 11 form fields
   out of raw complaint text.
2. **check_completeness** — pure Python; scores % of fields populated and lists gaps.
3. **classify_risk** — Groq (`openai/gpt-oss-120b`) classifies Critical / Major / Minor
   with a short rationale (ICH Q9-style reasoning).
4. **summarize_complaint** — 2–3 sentence QA-reviewer-facing summary.
5. **check_duplicate** — compares the new complaint against recent complaints in the DB
   (same batch/lot + similar description) and flags likely duplicates.

The graph is compiled once at startup (`complaint_graph`) and invoked per request in
`routers/ai.py`, which also handles parsing PDF/DOCX/TXT/EML uploads into plain text
before handing off to the graph.

## Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY and DATABASE_URL
uvicorn app.main:app --reload
```
Create a Postgres DB first: `createdb complaints_db` (or point `DATABASE_URL` at MySQL).
Get a free Groq API key at https://console.groq.com.

### Frontend
```bash
cd frontend
npm install
npm start
```
Set `REACT_APP_API_BASE` in a `.env` file if the backend isn't on `http://localhost:8000`.

## Key design decisions
- **Two-panel layout** mirrors the reference UI: manual entry form (source of truth,
  always editable) + AI assistant that *fills* the form rather than replacing it —
  a human reviewer always has final say, which matters in a regulated QMS context.
- **LangGraph over a single LLM call** so each concern (extraction, risk, summary,
  duplicate check) is independently testable, uses the right model for the job, and is
  easy to extend (e.g. adding a CAPA-recommendation node later).
- **Completeness score & missing-fields list** surface data quality issues immediately,
  instead of silently saving an incomplete complaint record.
- **Duplicate check** looks at recent DB records rather than the whole table, keeping
  the prompt small and the check fast.
- Production-grade OCR was explicitly out of scope, so PDF/DOCX/TXT/EML parsing uses
  lightweight libraries (`pypdf`, `docx2txt`, stdlib `email`) rather than a vision model.

## Demo flow
1. Open the app, click "click to browse" (or "Paste Complaint Text / Email").
2. Upload `sample-data/sample_complaint_1.txt` (or paste its contents).
3. Watch the extraction progress bar, then see the form auto-populate and the AI panel
   show completeness %, risk classification + rationale, summary, and duplicate flag.
4. Ask the chat assistant a follow-up question about the complaint.
5. Review/edit the form, then click "Save Complaint" to persist it to the database.
