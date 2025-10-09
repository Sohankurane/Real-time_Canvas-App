from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Path, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.websocket.manager import ConnectionManager
from app.database import engine, Base, Room, Snapshot, AsyncSessionLocal
from app.core.security import verify_token
from app.models import user
from sqlalchemy.future import select


app = FastAPI()
manager = ConnectionManager()


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "Collaborative Canvas Backend is running"}


# --- WEBSOCKET ENDPOINT WITH USERNAME (JWT) EXTRACTION ---
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str = Path(...)):
    token = websocket.query_params.get("token") or websocket.headers.get("Authorization")
    if not token:
        await websocket.close(code=4001)
        return
    try:
        if token.startswith("Bearer "):
            token = token.replace("Bearer ", "")
        username = verify_token(token)
        if not username:
            await websocket.close(code=4002)
            return
    except Exception:
        await websocket.close(code=4003)
        return


    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, room_id, username=username)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
# ---------------------------------------------------------


from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession


SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@app.get('/rooms')
async def list_rooms():
    async with SessionLocal() as session:
        result = await session.execute(Room.__table__.select())
        rooms = result.fetchall()
        room_objs = [{"name": row.name, "admin_username": row.admin_username} for row in rooms]
        return {"rooms": room_objs}


@app.post('/rooms')
async def create_room(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return JSONResponse(
            {"detail": "Authentication required"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    token = token.replace("Bearer ", "")
    try:
        username = verify_token(token)
        if not username:
            return JSONResponse({"detail": "Invalid token"}, status_code=401)
    except Exception:
        return JSONResponse({"detail": "Invalid token"}, status_code=401)


    data = await request.json()
    room_name = data.get("room")
    
    # ONLY CHANGE: Use manager's return value instead of duplicate DB check
    success = await manager.create_room_admin(room_name, username)
    if not success:
        return JSONResponse({"detail": "Room already exists"}, status_code=400)
    
    return {"success": True, "room": room_name, "admin": username}


@app.delete('/rooms/{room_name}')
async def delete_room(room_name: str, request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return JSONResponse(
            {"detail": "Authentication required"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    token = token.replace("Bearer ", "")
    try:
        username = verify_token(token)
        if not username:
            return JSONResponse({"detail": "Invalid token"}, status_code=401)
    except Exception:
        return JSONResponse({"detail": "Invalid token"}, status_code=401)


    async with SessionLocal() as session:
        result = await session.execute(Room.__table__.select().where(Room.name == room_name))
        room = result.first()
        if not room:
            return JSONResponse({"detail": "Room not found"}, status_code=404)
        db_admin_username = (room.admin_username or "").strip().lower()
        username_norm = (username or "").strip().lower()
        print(f"[DELETE] Room: {room_name}, DB Admin: {db_admin_username}, Current User: {username_norm}")
        if db_admin_username != username_norm:
            return JSONResponse({"detail": "Only admin can delete room"}, status_code=403)
        # Delete all snapshots for this room first, then delete room
        await session.execute(Snapshot.__table__.delete().where(Snapshot.room_id == room_name))
        await session.execute(Room.__table__.delete().where(Room.name == room_name))
        await session.commit()
    await manager.delete_room(room_name)
    return {"success": True, "detail": "Room deleted"}


# Add your authentication routes here as usual
from app.api.routes.auth import router as auth_router
app.include_router(auth_router)
