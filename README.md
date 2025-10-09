# Real-Time Collaborative Canvas Drawing App

A full-stack application that allows multiple users to create, edit, and collaborate on a digital canvas in real time. Built using **React** (frontend) and **FastAPI** with **WebSockets** (backend), with PostgreSQL for database storage.

***

## Features

- Real-time drawing: brush, shapes, color selection, text, undo/redo.
- Multi-user canvas management: see all users' actions live, cursor tracking, user presence display.
- Room-based collaboration: create, join, and delete rooms; each canvas session is isolated.
- Authentication: secure JWT-based login/register, password hashing with bcrypt.
- Admin features: room creation/deletion and permission management.
- Canvas persistence: automatic saving and retrieval from PostgreSQL.
- Snapshots/history: restore/replay previous drawing states.
- Robust conflict resolution, error handling, and security.

***

## Technologies Used

- **Frontend:** React, Context API, WebSocket API, CSS Modules
- **Backend:** FastAPI, SQLAlchemy (async), websockets, JWT (python-jose)
- **Database:** PostgreSQL
- **Authentication:** JWT, bcrypt
- **Deployment:** Uvicorn, Node

***

## Installation \& Setup

### Prerequisites

- Node.js \& npm
- Python 3.9+, pip
- PostgreSQL


### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate for Windows
pip install -r requirements.txt
# Set up PostgreSQL and update DATABASE_URL in database.py
# Example: postgresql+asyncpg://<username>:<password>@localhost:5432/canvasdb
uvicorn app.main:app --reload
```


### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000`; backend WebSocket/API runs on `http://localhost:8000`.

***

## API Overview

### REST Endpoints (main ones)

- `/register` — Register new user
- `/login` — Login, returns JWT token
- `/rooms` — Create/Get/Delete rooms
- `/canvas/snapshot` — Save/Restore canvas data


### WebSocket Endpoints

- `ws://localhost:8000/ws/{room_id}?token=<JWT>` — Main collaborative drawing channel
    - Supports events: drawing, erase, shapes, text, undo/redo, cursor, user join/leave, canvas state broadcast.

See backend code for full schema and event types; JWT required for protected actions.

***

## Frontend Usage

- Register or log in from the welcome screen.
- Create or join a room from the Room List.
- Use the drawing toolbar for brushes, shapes, colors, text, etc.
- All changes sync in real time for all users in the same room.
- Snapshots auto-save for session recovery.
- Room admin can delete the room.

***

## Database Models

- **User:** id, username, fullname, hashed_password
- **Room:** id, name (unique), admin_username
- **DrawingEvent:** id, coordinates, color, thickness, type
- **RoomHistory:** session history for replay/recovery
- **Snapshot:** current canvas state for fast restore

All models and relationships are defined in `backend/app/database.py`.

***

## Security \& Error Handling

- JWT authentication across endpoints and WebSocket
- Bcrypt password hashing
- Input validation and error handling
- CORS enabled for frontend-backend communication

***

## Contributors

- Sohan Kurane

***

## License

MIT License (update if needed)

***

**For more technical details**, see code comments in:

- Backend: `main.py`, `manager.py`, `database.py`, `auth.py`, `security.py`
- Frontend: `App.js`, `Canvas.js`, `RoomList.js`, `WebSocketContext.js`

***
## API Reference

### REST Endpoints

| **Endpoint** | **Method** | **Purpose** | **Request Example** | **Response Example** |
| :-- | :-- | :-- | :-- | :-- |
| `/register` | POST | Register new user | `{ "fullname": "Sohan Kurane", "username": "Sohan1", "password": "Kurane1234" }` | `{ "access_token": "...", "token_type": "bearer" }` |
| `/login` | POST | Authenticate user, returns JWT | `{ "username": "Sohan1", "password": "Kurane123" }` | `{ "access_token": "...", "token_type": "bearer" }` |
| `/rooms` | GET | List all available rooms | header: `Authorization: Bearer <token>` | `{ "rooms": [ { "name": "Room1", "admin_username": "Sohan1" }, ... ] }` |
| `/rooms` | POST | Create room | `{ "name": "Room1" }`, header: `Authorization: Bearer <token>` | `{ "message": "Room created", ...}` |
| `/rooms/{room_id}` | DELETE | Delete room (admin only) | header: `Authorization: Bearer <token>` | `{ "message": "Room deleted" }` |


***

### WebSocket Protocol

- **Endpoint:** `ws://localhost:8000/ws/{room_id}?token=<JWT>`
- **Events/messages:**

| **Type** | **Payload Example** | **Usage** |
| :-- | :-- | :-- |
| `drawing` | `{ type: "draw", from: [x1, y1], to: [x2, y2], color: "#123456", thickness: 3 }` | Broadcasts user’s drawing |
| `shape` | `{ type: "shape", shape: "rectangle", ... }` | Broadcasts new shape |
| `text` | `{ type: "text", value: "Hello", position: [x, y] }` | Places text |
| `undo` | `{ type: "undo" }` | Undo last action |
| `redo` | `{ type: "redo" }` | Redo last undone action |
| `cursor` | `{ type: "cursor", position: [x, y], user_id: "xyz" }` | Live cursor location update |
| `snapshot` | `{ type: "snapshot", state: {...} }` | Snapshot recovery/broadcast |
| `user_join` | `{ type: "user_join", username: "johnd" }` | User presence management |
| `user_leave` | `{ type: "user_leave", username: "johnd" }` | User left notification |

**All events are JSON. Users should send/receive events as specified. Unrecognized types are ignored.**

***

### Database Schema

erDiagram
USER {
int id PK
string fullname
string username
string hashed_password
}

text
ROOM {
  int id PK
  string name UNIQUE
  string admin_username
}

DRAWING_EVENT {
  int id PK
  float from_x
  float from_y
  float to_x
  float to_y
  string color
  float thickness
  string type
  int room_id FK
  datetime timestamp
}

ROOM_HISTORY {
  int id PK
  int room_id FK
  text history_payload
  datetime timestamp
}

SNAPSHOT {
  int id PK
  int room_id FK
  text canvas_state
  datetime timestamp
}

ROOM ||--o{ USER : "admin_username"
ROOM ||--|{ DRAWING_EVENT : "has"
ROOM ||--|{ ROOM_HISTORY : "has"
ROOM ||--|{ SNAPSHOT : "has"
