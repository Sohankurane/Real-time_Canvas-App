from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from app.database import Room, RoomHistory, Snapshot, ChatMessage
from app.core.logger import logger


class RoomService:
    """Service class for room-related operations"""
    
    @staticmethod
    async def get_room_by_name(db: AsyncSession, room_name: str) -> Room | None:
        """Fetch a room by name"""
        try:
            result = await db.execute(select(Room).where(Room.name == room_name))
            room = result.scalars().first()
            if room:
                logger.debug(f"Room found: {room_name}")
            return room
        except Exception as e:
            logger.error(f"Error fetching room {room_name}: {e}", exc_info=True)
            return None
    
    @staticmethod
    async def create_room(db: AsyncSession, room_name: str, admin_username: str) -> Room | None:
        """Create a new room with specified admin"""
        try:
            existing_room = await RoomService.get_room_by_name(db, room_name)
            if existing_room:
                logger.warning(f"Room creation failed: Room already exists - {room_name}")
                return None
            
            new_room = Room(name=room_name, admin_username=admin_username)
            db.add(new_room)
            await db.commit()
            await db.refresh(new_room)
            logger.info(f"Room created: {room_name} by admin {admin_username}")
            return new_room
        except Exception as e:
            logger.error(f"Error creating room {room_name}: {e}", exc_info=True)
            await db.rollback()
            return None
    
    @staticmethod
    async def list_all_rooms(db: AsyncSession) -> List[Dict[str, Any]]:
        """Get list of all rooms with their details"""
        try:
            result = await db.execute(Room.__table__.select())
            rooms = result.fetchall()
            room_list = [
                {"name": row.name, "admin_username": row.admin_username}
                for row in rooms
            ]
            logger.debug(f"Listed {len(room_list)} rooms")
            return room_list
        except Exception as e:
            logger.error(f"Error listing rooms: {e}", exc_info=True)
            return []
    
    @staticmethod
    async def is_room_admin(db: AsyncSession, room_name: str, username: str) -> bool:
        """Check if user is admin of the specified room"""
        try:
            room = await RoomService.get_room_by_name(db, room_name)
            if not room:
                logger.warning(f"Admin check failed: Room not found - {room_name}")
                return False
            
            room_admin = (room.admin_username or "").strip().lower()
            user_normalized = (username or "").strip().lower()
            
            is_admin = room_admin == user_normalized
            logger.debug(f"Admin check for {username} in room {room_name}: {is_admin}")
            return is_admin
        except Exception as e:
            logger.error(f"Error checking admin status for {username} in room {room_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    async def delete_room(db: AsyncSession, room_name: str) -> bool:
        """Delete a room and all associated data (snapshots, history, chat)"""
        try:
            room = await RoomService.get_room_by_name(db, room_name)
            if not room:
                logger.warning(f"Room deletion failed: Room not found - {room_name}")
                return False
            
            # Delete associated data first (foreign key constraints)
            await db.execute(Snapshot.__table__.delete().where(Snapshot.room_id == room_name))
            await db.execute(RoomHistory.__table__.delete().where(RoomHistory.room_id == room_name))
            await db.execute(ChatMessage.__table__.delete().where(ChatMessage.room_id == room_name))
            
            # Delete the room
            await db.execute(Room.__table__.delete().where(Room.name == room_name))
            await db.commit()
            
            logger.info(f"Room deleted successfully: {room_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting room {room_name}: {e}", exc_info=True)
            await db.rollback()
            return False
    
    @staticmethod
    async def room_exists(db: AsyncSession, room_name: str) -> bool:
        """Check if room exists"""
        room = await RoomService.get_room_by_name(db, room_name)
        return room is not None
