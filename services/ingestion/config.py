"""
Configuration for the ingestion service.
Reads DATABASE_URL from the shared .env file.
"""

import os
from dataclasses import dataclass, field

# Load .env from project root (2 levels up)
_env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
if os.path.exists(_env_file):
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


@dataclass
class Settings:
    database_url: str = ""
    host: str = "0.0.0.0"
    port: int = 8001
    allowed_origins: list = field(default_factory=lambda: ["http://localhost:3000"])
    upload_dir: str = ""

    def __post_init__(self):
        self.database_url = os.getenv("DATABASE_URL", "")
        self.upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_uploads")
        os.makedirs(self.upload_dir, exist_ok=True)


settings = Settings()
