import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.database import Base, engine
from app.routers import complaints, ai

logger = logging.getLogger(__name__)


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError:
        logger.exception(
            "Database initialization failed. The API will start, but "
            "database-backed features may fail until the connection is fixed."
        )


init_db()

fastapi_app = FastAPI(title="AI-Powered Customer Complaint Management System")

fastapi_app.include_router(complaints.router)
fastapi_app.include_router(ai.router)


@fastapi_app.get("/health")
def health():
    return {"status": "ok"}


# Keep CORS as the outermost ASGI wrapper so even unhandled 500 errors include
# CORS headers and the browser shows the real backend error instead of a CORS mask.
app = CORSMiddleware(
    app=fastapi_app,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
