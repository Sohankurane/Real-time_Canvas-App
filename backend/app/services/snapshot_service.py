from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
from app.database import Snapshot
from app.core.logger import logger


class SnapshotService:
    """Service class for canvas snapshot operations"""
    
    @staticmethod
    async def save_snapshot(
        db: AsyncSession,
        room_id: str,
        snapshot_data: str,
        saved_by: str
    ) -> Snapshot | None:
        """Save a new canvas snapshot"""
        try:
            snapshot = Snapshot(
                room_id=room_id,
                saved_by=saved_by,
                data=snapshot_data
            )
            db.add(snapshot)
            await db.commit()
            await db.refresh(snapshot)
            logger.info(f"Snapshot saved for room {room_id} by {saved_by}")
            return snapshot
        except Exception as e:
            logger.error(f"Error saving snapshot for room {room_id}: {e}", exc_info=True)
            await db.rollback()
            return None
    
    @staticmethod
    async def get_snapshots_by_room(db: AsyncSession, room_id: str) -> List[Dict[str, Any]]:
        """Get all snapshots for a room, ordered by creation date (newest first)"""
        try:
            result = await db.execute(
                select(Snapshot)
                .where(Snapshot.room_id == room_id)
                .order_by(Snapshot.created_at.desc())
            )
            snapshots = result.scalars().all()
            
            snapshot_list = [
                {
                    "id": snap.id,
                    "saved_by": snap.saved_by,
                    "created_at": str(snap.created_at)
                }
                for snap in snapshots
            ]
            logger.debug(f"Retrieved {len(snapshot_list)} snapshots for room {room_id}")
            return snapshot_list
        except Exception as e:
            logger.error(f"Error getting snapshots for room {room_id}: {e}", exc_info=True)
            return []
    
    @staticmethod
    async def get_snapshot_data(db: AsyncSession, snapshot_id: int) -> Optional[str]:
        """Get the canvas data for a specific snapshot"""
        try:
            result = await db.execute(
                select(Snapshot).where(Snapshot.id == snapshot_id)
            )
            snapshot = result.scalars().first()
            
            if snapshot:
                logger.debug(f"Retrieved snapshot data for snapshot ID {snapshot_id}")
                return snapshot.data
            logger.warning(f"Snapshot not found: {snapshot_id}")
            return None
        except Exception as e:
            logger.error(f"Error getting snapshot data for ID {snapshot_id}: {e}", exc_info=True)
            return None
    
    @staticmethod
    async def delete_snapshots_by_room(db: AsyncSession, room_id: str) -> bool:
        """Delete all snapshots for a specific room"""
        try:
            await db.execute(
                Snapshot.__table__.delete().where(Snapshot.room_id == room_id)
            )
            await db.commit()
            logger.info(f"Deleted all snapshots for room {room_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting snapshots for room {room_id}: {e}", exc_info=True)
            await db.rollback()
            return False
