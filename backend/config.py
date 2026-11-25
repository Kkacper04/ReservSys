from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ALLOWED_JWT_ALGORITHMS = {"HS256", "HS384", "HS512"}
PLACEHOLDER_SECRET = "generate-your-own-secret-key-here"


class Settings(BaseSettings):
    database_url: str = ""
    secret_key: str = ""
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    algorithm: str = "HS256"
    admin_password: str = ""
    lm_studio_url: str = "http://localhost:1234/v1"
    cookie_secure: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("algorithm")
    @classmethod
    def validate_algorithm(cls, value: str) -> str:
        algo = value.strip().upper()
        if algo not in ALLOWED_JWT_ALGORITHMS:
            raise ValueError(f"Unsupported JWT algorithm: {value}")
        return algo


settings = Settings()


def get_secret_key() -> str:
    key = settings.secret_key.strip()
    if not key or key == PLACEHOLDER_SECRET or len(key) < 32:
        raise RuntimeError(
            "SECRET_KEY must be configured with at least 32 characters."
        )
    return key
