import os  # For environment variable access
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

# reads from environment variable on Render
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:Sohan@localhost:5432/canvasdb")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# Room table with admin/permission
class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # Room name or ID
    admin_username = Column(String, index=True)     # Username of the admin

# Drawing event for fine-grained replay (optional)
class DrawingEvent(Base):
    __tablename__ = "drawingevents"
    id = Column(Integer, primary_key=True, index=True)
    fromx = Column(Float)
    fromy = Column(Float)
    tox = Column(Float)
    toy = Column(Float)
    color = Column(String, default="#000000")
    thickness = Column(Float, default=3)

# Canvas session history for each room (current state, can be replaced by snapshots)
class RoomHistory(Base):
    __tablename__ = "room_history"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True, unique=True)
    history_json = Column(Text)  # list of all events as JSON string

# NEW: Snapshot/Version per room, with user, timestamp, and data
class Snapshot(Base):
    __tablename__ = 'snapshots'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.name"), index=True)
    saved_by = Column(String, nullable=False)   # Username (can be changed to integer User.id FK)
    data = Column(Text, nullable=False)         # Serialized canvas JSON/string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# NEW: ChatMessage table for chat box feature
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True)        # Room name or ID
    username = Column(String, index=True)       # Username of the sender
    message = Column(Text, nullable=False)      # Message text
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# Dependency for FastAPI routes/services
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
