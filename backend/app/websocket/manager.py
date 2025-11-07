from typing import Dict, List
from fastapi import WebSocket
import json
from app.database import AsyncSessionLocal, RoomHistory, Room, Snapshot, ChatMessage
from sqlalchemy.future import select
from datetime import datetime

MAX_HISTORY = 500  # Cap history per room for performance

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

        # Load room history from database if not in memory
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
            
            if room_id in self.active_connections and not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")

    async def save_room_history(self, room_id):
        try:
            async with AsyncSessionLocal() as session:
                events = self.history.get(room_id, [])
                result = await session.execute(select(RoomHistory).where(RoomHistory.room_id == room_id))
                obj = result.scalars().first()
                if obj:
                    obj.history_json = json.dumps(events)
                else:
                    obj = RoomHistory(room_id=room_id, history_json=json.dumps(events))
                    session.add(obj)
                await session.commit()
        except Exception as e:
            print(f"Error saving room history: {e}")

    async def load_room_history(self, room_id):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(RoomHistory).where(RoomHistory.room_id == room_id))
                obj = result.scalars().first()
                if obj and obj.history_json:
                    self.history[room_id] = json.loads(obj.history_json)
                else:
                    self.history[room_id] = []
        except Exception as e:
            print(f"Error loading room history: {e}")
            self.history[room_id] = []

    async def broadcast(self, message: str, room_id: str, username: str = None, sender_ws: WebSocket = None):
        try:
            event = json.loads(message)
            event_type = event.get('type')
        except Exception as e:
            print(f"Error parsing message: {e}")
            event_type = None

        # Save chat message to DB
        if event_type == "chat":
            await self.save_chat_message(
                room_id,
                event.get("username"),
                event.get("message"),
                event.get("timestamp")
            )

        if event_type == "clear":
            is_admin = await self.is_admin(room_id, username)
            if is_admin:
                self.history[room_id] = []
                await self.save_room_history(room_id)
            else:
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "error", "message": "Only the room admin can clear the board."}))
                    except:
                        pass
                return

        elif event_type == "delete_room":
            is_admin = await self.is_admin(room_id, username)
            if is_admin:
                await self.delete_room(room_id)
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "info", "message": "Room deleted by admin."}))
                    except:
                        pass
            else:
                for connection in self.active_connections.get(room_id, []):
                    try:
                        await connection.send_text(json.dumps({"type": "error", "message": "Only admin can delete the room."}))
                    except:
                        pass
            return

        elif event_type not in ("cursor", "undo", "chat"):
            self.history.setdefault(room_id, []).append(message)
            if len(self.history[room_id]) > MAX_HISTORY:
                self.history[room_id] = self.history[room_id][-MAX_HISTORY:]
            await self.save_room_history(room_id)

        if event_type == "save_snapshot":
            await self.save_snapshot(room_id, event["snapshot"], event["username"])
            snaphistory = await self.get_snapshots(room_id)
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
            snap_data = await self.get_snapshot_data(event["snapshot_id"])
            restored_by = event["username"]
            if snap_data:
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
            snaphistory = await self.get_snapshots(room_id)
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
                print(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            await self.disconnect(conn, room_id)

    # Save chat messages to database with timestamp conversion
    async def save_chat_message(self, room_id, username, message, timestamp):
        try:
            if isinstance(timestamp, str):
                
                if timestamp.endswith('Z'):
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    timestamp = datetime.fromisoformat(timestamp)
            async with AsyncSessionLocal() as session:
                chat_msg = ChatMessage(
                    room_id=room_id,
                    username=username,
                    message=message,
                    timestamp=timestamp
                )
                session.add(chat_msg)
                await session.commit()
        except Exception as e:
            print(f"Error saving chat message: {e}")

    def list_rooms(self):
        return list(self.rooms)

    async def create_room_admin(self, room_name: str, admin_username: str) -> bool:
        self.rooms.add(room_name)
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Room).where(Room.name == room_name)
                )
                obj = result.scalars().first()
                if obj:
                    return False
                room_obj = Room(name=room_name, admin_username=admin_username)
                session.add(room_obj)
                await session.commit()
                return True
        except Exception as e:
            print(f"Error creating room: {e}")
            return False

    async def delete_room(self, room_id: str):
        if room_id in self.rooms:
            self.rooms.remove(room_id)
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    Room.__table__.delete().where(Room.name == room_id)
                )
                await session.execute(
                    RoomHistory.__table__.delete().where(RoomHistory.room_id == room_id)
                )
                await session.execute(
                    Snapshot.__table__.delete().where(Snapshot.room_id == room_id)
                )
                await session.execute(
                    ChatMessage.__table__.delete().where(ChatMessage.room_id == room_id)
                )
                await session.commit()
        except Exception as e:
            print(f"Error deleting room: {e}")
        if room_id in self.active_connections:
            del self.active_connections[room_id]
        if room_id in self.history:
            del self.history[room_id]

    async def is_admin(self, room_name: str, username: str):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(Room).where(Room.name == room_name))
                room = result.scalars().first()
                return room and (room.admin_username or "").strip().lower() == (username or "").strip().lower()
        except Exception as e:
            print(f"Error checking admin status: {e}")
            return False

    # SNAPSHOT LOGIC
    async def save_snapshot(self, room_id, snapshot_data, saved_by):
        try:
            async with AsyncSessionLocal() as session:
                snapshot = Snapshot(room_id=room_id, saved_by=saved_by, data=snapshot_data)
                session.add(snapshot)
                await session.commit()
        except Exception as e:
            print(f"Error saving snapshot: {e}")

    async def get_snapshots(self, room_id):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Snapshot).where(Snapshot.room_id == room_id).order_by(Snapshot.created_at.desc())
                )
                snapshots = result.scalars().all()
                return [
                    {
                        "id": snap.id,
                        "saved_by": snap.saved_by,
                        "created_at": str(snap.created_at)
                    }
                    for snap in snapshots
                ]
        except Exception as e:
            print(f"Error getting snapshots: {e}")
            return []

    async def get_snapshot_data(self, snapshot_id):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Snapshot).where(Snapshot.id == snapshot_id)
                )
                snap = result.scalars().first()
                if snap:
                    return snap.data
                return None
        except Exception as e:
            print(f"Error getting snapshot data: {e}")
            return None
