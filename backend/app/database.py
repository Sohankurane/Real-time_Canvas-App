from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


# Room table with admin/permission
class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    admin_username = Column(String, index=True)
    
    __table_args__ = (
        Index('idx_room_name_admin', 'name', 'admin_username'),
    )


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


# Canvas session history for each room
class RoomHistory(Base):
    __tablename__ = "room_history"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True, unique=True)
    history_json = Column(Text)


# Snapshot/Version per room
class Snapshot(Base):
    __tablename__ = 'snapshots'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.name"), index=True)
    saved_by = Column(String, nullable=False, index=True)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    __table_args__ = (
        Index('idx_snapshot_room_created', 'room_id', 'created_at'),
    )


# ChatMessage table for chat box feature
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True)
    username = Column(String, index=True)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    __table_args__ = (
        Index('idx_chat_room_timestamp', 'room_id', 'timestamp'),
    )


# Dependency for FastAPI routes/services
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
