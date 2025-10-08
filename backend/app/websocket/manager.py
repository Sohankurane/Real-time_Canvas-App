from typing import Dict, List
from fastapi import WebSocket
import json
from app.database import AsyncSessionLocal, RoomHistory, Room, Snapshot
from sqlalchemy.future import select

MAX_HISTORY = 500  # Cap history per room for performance

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.history: Dict[str, List[str]] = {}
        self.rooms: set = set()

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        self.rooms.add(room_id)
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

    def disconnect(self, websocket: WebSocket, room_id: str):
        if (
            room_id in self.active_connections and
            websocket in self.active_connections[room_id]
        ):
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def save_room_history(self, room_id):
        async with AsyncSessionLocal() as session:
            events = self.history.get(room_id, [])
            result = await session.execute(
                select(RoomHistory).where(RoomHistory.room_id == room_id)
            )
            obj = result.scalars().first()
            if obj:
                obj.history_json = json.dumps(events)
            else:
                obj = RoomHistory(room_id=room_id, history_json=json.dumps(events))
                session.add(obj)
            await session.commit()

    async def load_room_history(self, room_id):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(RoomHistory).where(RoomHistory.room_id == room_id)
            )
            obj = result.scalars().first()
            if obj and obj.history_json:
                self.history[room_id] = json.loads(obj.history_json)
            else:
                self.history[room_id] = []

    async def broadcast(self, message: str, room_id: str, username: str = None):
        try:
            event = json.loads(message)
            event_type = event.get('type')
        except Exception:
            event_type = None

        # --- ADMIN-ONLY: "clear" (Reset/canvas wipe) ---
        if event_type == "clear":
            is_admin = await self.is_admin(room_id, username)
            if is_admin:
                self.history[room_id] = []
                await self.save_room_history(room_id)
            else:
                for connection in self.active_connections.get(room_id, []):
                    await connection.send_text(
                        json.dumps({"type": "error", "message": "Only the room admin can clear the board."})
                    )
                return

        # --- ADMIN-ONLY: "delete_room" (Optional feature) ---
        elif event_type == "delete_room":
            is_admin = await self.is_admin(room_id, username)
            if is_admin:
                await self.delete_room(room_id)
                for connection in self.active_connections.get(room_id, []):
                    await connection.send_text(
                        json.dumps({"type": "info", "message": "Room deleted by admin."})
                    )
            else:
                for connection in self.active_connections.get(room_id, []):
                    await connection.send_text(
                        json.dumps({"type": "error", "message": "Only admin can delete the room."})
                    )
            return

        # Only persist events that need to be kept, with capped history
        elif event_type not in ("cursor", "undo"):
            self.history.setdefault(room_id, []).append(message)
            if len(self.history[room_id]) > MAX_HISTORY:
                self.history[room_id] = self.history[room_id][-MAX_HISTORY:]
            await self.save_room_history(room_id)

        # --------- SNAPSHOT VERSIONING LOGIC BELOW ------------

        # Save snapshot event from frontend
        if event_type == "save_snapshot":
            await self.save_snapshot(room_id, event["snapshot"], event["username"])
            snaphistory = await self.get_snapshots(room_id)
            for connection in self.active_connections.get(room_id, []):
                await connection.send_text(json.dumps({
                    "type": "snapshots_history",
                    "snapshots": snaphistory
                }))
            return  # Don't broadcast original save_snapshot event beyond this

        # Restore snapshot event from frontend
        if event_type == "restore_snapshot":
            snap_data = await self.get_snapshot_data(event["snapshot_id"])
            restored_by = event["username"]
            if snap_data:
                for connection in self.active_connections.get(room_id, []):
                    await connection.send_text(json.dumps({
                        "type": "snapshot_restored",
                        "snapshot_id": event["snapshot_id"],
                        "snapshot_data": snap_data,
                        "restored_by": restored_by
                    }))
            return

        # Frontend requests full snapshot list for this room
        if event_type == "get_snapshots":
            snaphistory = await self.get_snapshots(room_id)
            for connection in self.active_connections.get(room_id, []):
                await connection.send_text(json.dumps({
                    "type": "snapshots_history",
                    "snapshots": snaphistory
                }))
            return

        # All other events: broadcast as before
        for connection in self.active_connections.get(room_id, []):
            await connection.send_text(message)

    def list_rooms(self):
        return list(self.rooms)

    async def create_room_admin(self, room_name: str, admin_username: str):
        self.rooms.add(room_name)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Room).where(Room.name == room_name)
            )
            obj = result.scalars().first()
            if not obj:
                room_obj = Room(name=room_name, admin_username=admin_username)
                session.add(room_obj)
                await session.commit()

    async def delete_room(self, room_id: str):
        if room_id in self.rooms:
            self.rooms.remove(room_id)
        async with AsyncSessionLocal() as session:
            await session.execute(
                Room.__table__.delete().where(Room.name == room_id)
            )
            await session.execute(
                RoomHistory.__table__.delete().where(RoomHistory.room_id == room_id)
            )
            await session.commit()
        if room_id in self.active_connections:
            del self.active_connections[room_id]
        if room_id in self.history:
            del self.history[room_id]

    async def is_admin(self, room_name: str, username: str):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Room).where(Room.name == room_name))
            room = result.scalars().first()
            # Robust admin check: case- and whitespace-insensitive
            return room and (room.admin_username or "").strip().lower() == (username or "").strip().lower()

    # ------- SNAPSHOT LOGIC -------
    async def save_snapshot(self, room_id, snapshot_data, saved_by):
        async with AsyncSessionLocal() as session:
            snapshot = Snapshot(room_id=room_id, saved_by=saved_by, data=snapshot_data)
            session.add(snapshot)
            await session.commit()

    async def get_snapshots(self, room_id):
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

    async def get_snapshot_data(self, snapshot_id):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Snapshot).where(Snapshot.id == snapshot_id)
            )
            snap = result.scalars().first()
            if snap:
                return snap.data
            return None
