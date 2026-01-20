"""
Configuration module for Dunkerton Sales import pipeline.
Loads environment variables from .env file.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
load_dotenv(env_path)


class Config:
    """Application configuration from environment variables."""

    # Supabase settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # Database settings (direct connection)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Import settings
    DEFAULT_DISTRIBUTOR: str = "Inn Express"
    MAPPING_COVERAGE_TARGET: float = 95.0

    # Paths
    DATA_DIR: Path = project_root / "data"
    RAW_DIR: Path = DATA_DIR / "raw"
    SEED_DIR: Path = DATA_DIR / "seed"

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration is present."""
        errors = []

        if not cls.SUPABASE_URL:
            errors.append("SUPABASE_URL is required")
        if not cls.SUPABASE_KEY and not cls.SUPABASE_SERVICE_KEY:
            errors.append("SUPABASE_KEY or SUPABASE_SERVICE_KEY is required")

        if errors:
            for error in errors:
                print(f"Config Error: {error}")
            return False

        return True

    @classmethod
    def get_supabase_key(cls) -> str:
        """Get the appropriate Supabase key (prefer service key for imports)."""
        return cls.SUPABASE_SERVICE_KEY or cls.SUPABASE_KEY


config = Config()
