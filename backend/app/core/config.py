import os
from typing import List


class Settings:
    """Application settings and configuration"""
    
    # Application
    APP_NAME: str = "Collaborative Canvas API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:Sohan@localhost:5432/canvasdb"
    )
    
    # Security / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "Sohan_Secret_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ]
    
    # WebSocket
    MAX_HISTORY_PER_ROOM: int = int(os.getenv("MAX_HISTORY_PER_ROOM", "500"))
    WEBSOCKET_TIMEOUT: int = int(os.getenv("WEBSOCKET_TIMEOUT", "300"))
    
    # Canvas
    CANVAS_WIDTH: int = 1200
    CANVAS_HEIGHT: int = 700
    
    # Chat
    MAX_CHAT_HISTORY: int = int(os.getenv("MAX_CHAT_HISTORY", "100"))
    
    # Snapshot
    MAX_SNAPSHOTS_PER_ROOM: int = int(os.getenv("MAX_SNAPSHOTS_PER_ROOM", "50"))
    
    @classmethod
    def get_allowed_origins(cls) -> List[str]:
        """Get filtered list of allowed origins (removes empty strings)"""
        return [origin for origin in cls.ALLOWED_ORIGINS if origin]


# Create a global settings instance
settings = Settings()
