from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
import json
from app.database import RoomHistory, ChatMessage
from app.core.logger import logger


class CanvasService:
    """Service class for canvas drawing history and chat operations"""
    
    @staticmethod
    async def save_room_history(db: AsyncSession, room_id: str, events: List[str]) -> bool:
        """Save or update room drawing history"""
        try:
            result = await db.execute(
                select(RoomHistory).where(RoomHistory.room_id == room_id)
            )
            room_history = result.scalars().first()
            
            if room_history:
                room_history.history_json = json.dumps(events)
                logger.debug(f"Updated history for room {room_id} ({len(events)} events)")
            else:
                room_history = RoomHistory(
                    room_id=room_id,
                    history_json=json.dumps(events)
                )
                db.add(room_history)
                logger.debug(f"Created new history for room {room_id} ({len(events)} events)")
            
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving room history for {room_id}: {e}", exc_info=True)
            await db.rollback()
            return False
    
    @staticmethod
    async def load_room_history(db: AsyncSession, room_id: str) -> List[str]:
        """Load drawing history for a room"""
        try:
            result = await db.execute(
                select(RoomHistory).where(RoomHistory.room_id == room_id)
            )
            room_history = result.scalars().first()
            
            if room_history and room_history.history_json:
                events = json.loads(room_history.history_json)
                logger.debug(f"Loaded history for room {room_id} ({len(events)} events)")
                return events
            logger.debug(f"No history found for room {room_id}")
            return []
        except Exception as e:
            logger.error(f"Error loading room history for {room_id}: {e}", exc_info=True)
            return []
    
    @staticmethod
    async def clear_room_history(db: AsyncSession, room_id: str) -> bool:
        """Clear drawing history for a room"""
        try:
            await db.execute(
                RoomHistory.__table__.delete().where(RoomHistory.room_id == room_id)
            )
            await db.commit()
            logger.info(f"Cleared history for room {room_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing room history for {room_id}: {e}", exc_info=True)
            await db.rollback()
            return False
    
    @staticmethod
    async def save_chat_message(
        db: AsyncSession,
        room_id: str,
        username: str,
        message: str,
        timestamp: datetime
    ) -> bool:
        """Save a chat message to database"""
        try:
            # Handle timestamp conversion if it's a string
            if isinstance(timestamp, str):
                if timestamp.endswith('Z'):
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    timestamp = datetime.fromisoformat(timestamp)
            
            chat_msg = ChatMessage(
                room_id=room_id,
                username=username,
                message=message,
                timestamp=timestamp
            )
            db.add(chat_msg)
            await db.commit()
            logger.debug(f"Chat message saved in room {room_id} by {username}")
            return True
        except Exception as e:
            logger.error(f"Error saving chat message in room {room_id}: {e}", exc_info=True)
            await db.rollback()
            return False
    
    @staticmethod
    async def get_chat_history(
        db: AsyncSession,
        room_id: str,
        limit: int = 100
    ) -> List[dict]:
        """Get chat message history for a room"""
        try:
            result = await db.execute(
                select(ChatMessage)
                .where(ChatMessage.room_id == room_id)
                .order_by(ChatMessage.timestamp.desc())
                .limit(limit)
            )
            messages = result.scalars().all()
            
            chat_history = [
                {
                    "username": msg.username,
                    "message": msg.message,
                    "timestamp": str(msg.timestamp)
                }
                for msg in reversed(messages)
            ]
            logger.debug(f"Retrieved {len(chat_history)} chat messages for room {room_id}")
            return chat_history
        except Exception as e:
            logger.error(f"Error getting chat history for room {room_id}: {e}", exc_info=True)
            return []
    
    @staticmethod
    async def delete_room_data(db: AsyncSession, room_id: str) -> bool:
        """Delete all canvas data (history and chat) for a room"""
        try:
            await db.execute(
                RoomHistory.__table__.delete().where(RoomHistory.room_id == room_id)
            )
            await db.execute(
                ChatMessage.__table__.delete().where(ChatMessage.room_id == room_id)
            )
            await db.commit()
            logger.info(f"Deleted all canvas data for room {room_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting room data for {room_id}: {e}", exc_info=True)
            await db.rollback()
            return False
