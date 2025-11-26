from typing import Dict, List
from fastapi import WebSocket
import json
from app.database import AsyncSessionLocal
from app.services.room_service import RoomService
from app.services.canvas_service import CanvasService
from app.services.snapshot_service import SnapshotService
from app.core.config import settings
from app.core.logger import logger


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.history: Dict[str, List[str]] = {}
        self.rooms: set = set()
        self.socket_user_map: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_id: str, username: str = None):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        self.rooms.add(room_id)
        if username:
            self.socket_user_map[websocket] = username
        
        logger.info(f"User {username} connected to room {room_id}")

        if room_id not in self.history:
            await self.load_room_history(room_id)

        filtered_history = [
            event for event in self.history.get(room_id, [])
            if not json.loads(event).get("type") == "cursor"
        ]

        if filtered_history:
            await websocket.send_text(
                '{"type":"init","history":[' + ','.join(filtered_history) + ']}'
            )
            logger.debug(f"Sent {len(filtered_history)} history events to {username} in room {room_id}")

    async def disconnect(self, websocket: WebSocket, room_id: str):
        username = self.socket_user_map.pop(websocket, None)
        if (
            room_id in self.active_connections and
            websocket in self.active_connections[room_id]
        ):
            self.active_connections[room_id].remove(websocket)
            if username:
                await self.broadcast(
                    json.dumps({"type": "user_left", "username": username}),
                    room_id
                )
                logger.info(f"User {username} disconnected from room {room_id}")
            
            if room_id in self.active_connections and not self.active_connections[room_id]:
                del self.active_connections[room_id]
                logger.debug(f"Room {room_id} has no active connections")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def save_room_history(self, room_id):
        """Save room drawing history using CanvasService"""
        async with AsyncSessionLocal() as session:
            events = self.history.get(room_id, [])
            await CanvasService.save_room_history(session, room_id, events)

    async def load_room_history(self, room_id):
        """Load room drawing history using CanvasService"""
        async with AsyncSessionLocal() as session:
            self.history[room_id] = await CanvasService.load_room_history(session, room_id)

    async def broadcast(self, message: str, room_id: str, username: str = None, sender_ws: WebSocket = None):
        try:
            event = json.loads(message)
            event_type = event.get('type')
        except Exception as e:
            logger.error(f"Error parsing WebSocket message: {e}")
            event_type = None

        if event_type == "chat":
            async with AsyncSessionLocal() as session:
                from datetime import datetime
                await CanvasService.save_chat_message(
                    session,
                    room_id,
                    event.get("username"),
                    event.get("message"),
                    event.get("timestamp") or datetime.utcnow()
                )

        if event_type == "clear":
            async with AsyncSessionLocal() as session:
                is_admin = await RoomService.is_room_admin(session, room_id, username)
            if is_admin:
                self.history[room_id] = []
                await self.save_room_history(room_id)
                logger.info(f"Room {room_id} cleared by admin {username}")
            else:
                logger.warning(f"Non-admin user {username} attempted to clear room {room_id}")
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "error", "message": "Only the room admin can clear the board."}))
                    except:
                        pass
                return

        elif event_type == "delete_room":
            async with AsyncSessionLocal() as session:
                is_admin = await RoomService.is_room_admin(session, room_id, username)
            if is_admin:
                await self.delete_room(room_id)
                logger.info(f"Room {room_id} deleted by admin {username}")
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "info", "message": "Room deleted by admin."}))
                    except:
                        pass
            else:
                logger.warning(f"Non-admin user {username} attempted to delete room {room_id}")
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "error", "message": "Only admin can delete the room."}))
                    except:
                        pass
            return

        elif event_type not in ("cursor", "undo", "chat"):
            self.history.setdefault(room_id, []).append(message)
            if len(self.history[room_id]) > settings.MAX_HISTORY_PER_ROOM:
                self.history[room_id] = self.history[room_id][-settings.MAX_HISTORY_PER_ROOM:]
            await self.save_room_history(room_id)

        if event_type == "save_snapshot":
            async with AsyncSessionLocal() as session:
                await SnapshotService.save_snapshot(
                    session,
                    room_id,
                    event["snapshot"],
                    event["username"]
                )
                snaphistory = await SnapshotService.get_snapshots_by_room(session, room_id)
            for connection in self.active_connections.get(room_id, []):
                try:
                    await connection.send_text(json.dumps({
                        "type": "snapshots_history",
                        "snapshots": snaphistory
                    }))
                except:
                    pass
            return

        if event_type == "restore_snapshot":
            async with AsyncSessionLocal() as session:
                snap_data = await SnapshotService.get_snapshot_data(session, event["snapshot_id"])
            restored_by = event["username"]
            if snap_data:
                logger.info(f"Snapshot {event['snapshot_id']} restored in room {room_id} by {restored_by}")
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({
                            "type": "snapshot_restored",
                            "snapshot_id": event["snapshot_id"],
                            "snapshot_data": snap_data,
                            "restored_by": restored_by
                        }))
                    except:
                        pass
            return

        if event_type == "get_snapshots":
            async with AsyncSessionLocal() as session:
                snaphistory = await SnapshotService.get_snapshots_by_room(session, room_id)
            for connection in self.active_connections.get(room_id, []):
                try:
                    await connection.send_text(json.dumps({
                        "type": "snapshots_history",
                        "snapshots": snaphistory
                    }))
                except:
                    pass
            return

        disconnected = []
        for connection in self.active_connections.get(room_id, []):
            
            if sender_ws and connection == sender_ws and event_type in (
                "webrtc-offer", "webrtc-answer", "webrtc-candidate"
            ):
                continue
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client in room {room_id}: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            await self.disconnect(conn, room_id)

    def list_rooms(self):
        return list(self.rooms)

    async def create_room_admin(self, room_name: str, admin_username: str) -> bool:
        """Create room using RoomService"""
        self.rooms.add(room_name)
        async with AsyncSessionLocal() as session:
            room = await RoomService.create_room(session, room_name, admin_username)
            return room is not None

    async def delete_room(self, room_id: str):
        """Delete room using RoomService"""
        if room_id in self.rooms:
            self.rooms.remove(room_id)
        
        async with AsyncSessionLocal() as session:
            await RoomService.delete_room(session, room_id)
        
        if room_id in self.active_connections:
            del self.active_connections[room_id]
        if room_id in self.history:
            del self.history[room_id]
