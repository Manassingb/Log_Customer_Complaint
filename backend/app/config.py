import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


DEPRECATED_MODEL_REPLACEMENTS = {
    "gemma2-9b-it": "openai/gpt-oss-20b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
}


class Settings(BaseSettings):
    # Database (Postgres or MySQL - just change the URL scheme)
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/complaints_db"
    )

    # Groq LLM
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_extraction_model: str = os.getenv("GROQ_EXTRACTION_MODEL", "openai/gpt-oss-20b")
    groq_context_model: str = os.getenv("GROQ_CONTEXT_MODEL", "openai/gpt-oss-120b")

    @field_validator("groq_extraction_model", "groq_context_model")
    @classmethod
    def replace_deprecated_model(cls, value: str) -> str:
        return DEPRECATED_MODEL_REPLACEMENTS.get(value, value)

    class Config:
        env_file = ".env"


settings = Settings()
