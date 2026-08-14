from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = ""
    secret_key: str = ""
    allowed_origins: str = ""
    algorithm: str = "HS256"
    admin_password: str = ""
    lm_studio_url: str = "http://192.168.1.141:1234/v1"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()


