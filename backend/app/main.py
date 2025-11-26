from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Path, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.websocket.manager import ConnectionManager
from app.database import engine, Base, AsyncSessionLocal
from app.core.security import verify_token
from app.core.config import settings
from app.services.room_service import RoomService
from app.core.logger import logger


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)
manager = ConnectionManager()


# CORS with configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} started successfully")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info(f"{settings.APP_NAME} shutting down")


@app.get("/")
async def root():
    return {
        "message": f"{settings.APP_NAME} is running",
        "version": settings.APP_VERSION
    }


# --- WEBSOCKET ENDPOINT WITH USERNAME (JWT) EXTRACTION ---
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str = Path(...)):
    token = websocket.query_params.get("token") or websocket.headers.get("Authorization")
    if not token:
        logger.warning(f"WebSocket connection rejected: No token provided for room {room_id}")
        await websocket.close(code=4001)
        return
    
    try:
        if token.startswith("Bearer "):
            token = token.replace("Bearer ", "")
        username = verify_token(token)
        if not username:
            logger.warning(f"WebSocket connection rejected: Invalid token for room {room_id}")
            await websocket.close(code=4002)
            return
    except Exception as e:
        logger.error(f"WebSocket token verification error for room {room_id}: {e}")
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, room_id, username=username)
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                await manager.broadcast(data, room_id, username=username, sender_ws=websocket)
            except WebSocketDisconnect:
                logger.debug(f"WebSocket disconnect detected for {username} in room {room_id}")
                break  # Exit the while loop cleanly
            except RuntimeError as e:
                if "WebSocket is not connected" in str(e):
                    logger.debug(f"WebSocket already closed for {username} in room {room_id}")
                    break
                else:
                    raise  # Re-raise other RuntimeErrors
    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected for {username} in room {room_id}")
    except RuntimeError as e:
        if "WebSocket is not connected" in str(e):
            logger.debug(f"WebSocket connection lost for {username} in room {room_id}")
        else:
            logger.error(f"Runtime error for {username} in room {room_id}: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for {username} in room {room_id}: {e}", exc_info=True)
    finally:
        try:
            await manager.disconnect(websocket, room_id)
        except Exception as disconnect_error:
            logger.debug(f"Cleanup error during disconnect for {username} in room {room_id}: {disconnect_error}")


@app.get('/rooms')
async def list_rooms():
    """Get list of all rooms using RoomService"""
    logger.debug("Listing all rooms")
    async with AsyncSessionLocal() as session:
        rooms = await RoomService.list_all_rooms(session)
        return {"rooms": rooms}


@app.post('/rooms', status_code=status.HTTP_201_CREATED)
async def create_room(request: Request):
    """Create a new room using RoomService"""
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        logger.warning("Room creation rejected: No authentication token")
        return JSONResponse(
            {"detail": "Authentication required"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    token = token.replace("Bearer ", "")
    
    try:
        username = verify_token(token)
        if not username:
            logger.warning("Room creation rejected: Invalid token")
            return JSONResponse({"detail": "Invalid token"}, status_code=401)
    except Exception:
        logger.warning("Room creation rejected: Token verification failed")
        return JSONResponse({"detail": "Invalid token"}, status_code=401)

    data = await request.json()
    room_name = data.get("room")
    
    success = await manager.create_room_admin(room_name, username)
    if not success:
        logger.warning(f"Room creation failed: Room {room_name} already exists")
        return JSONResponse({"detail": "Room already exists"}, status_code=400)
    
    logger.info(f"Room {room_name} created by {username}")
    return {"success": True, "room": room_name, "admin": username}


@app.delete('/rooms/{room_name}')
async def delete_room(room_name: str, request: Request):
    """Delete a room using RoomService"""
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        logger.warning(f"Room deletion rejected: No authentication token for room {room_name}")
        return JSONResponse(
            {"detail": "Authentication required"},
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    token = token.replace("Bearer ", "")
    
    try:
        username = verify_token(token)
        if not username:
            logger.warning(f"Room deletion rejected: Invalid token for room {room_name}")
            return JSONResponse({"detail": "Invalid token"}, status_code=401)
    except Exception:
        logger.warning(f"Room deletion rejected: Token verification failed for room {room_name}")
        return JSONResponse({"detail": "Invalid token"}, status_code=401)

    async with AsyncSessionLocal() as session:
        room = await RoomService.get_room_by_name(session, room_name)
        if not room:
            logger.warning(f"Room deletion failed: Room {room_name} not found")
            return JSONResponse({"detail": "Room not found"}, status_code=404)
        
        is_admin = await RoomService.is_room_admin(session, room_name, username)
        if not is_admin:
            logger.warning(f"Room deletion rejected: User {username} is not admin of room {room_name}")
            return JSONResponse({"detail": "Only admin can delete room"}, status_code=403)
        
        await RoomService.delete_room(session, room_name)
    
    await manager.delete_room(room_name)
    logger.info(f"Room {room_name} deleted by admin {username}")
    return {"success": True, "detail": "Room deleted"}


# Include auth routes
from app.api.routes.auth import router as auth_router
app.include_router(auth_router)
