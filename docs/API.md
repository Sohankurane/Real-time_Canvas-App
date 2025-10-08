## API Reference

### REST Endpoints


Endpoint      |  Method  |  Purpose                         |  Request Example                      |  Response Example                                     |
                                                                                                                                                            |    
--------------+----------+----------------------------------+---------------------------------------+----------------------------------------------------+- |+--------------------------------------------------------------------------------------------------------------------------------------------------------+  |
/register     |  POST    |  Register new user               |  { "fullname": "Sohan Kurane",        | { "access_token": "...", "token_type": "bearer" }     |
              |          |                                  |    "username": "Sohan1",              |                                                       |
              |          |                                  |    "password": "kurane1234" }         |                                                       |
+--------------------------------------------------------------------------------------------------------------------------------------------------------+  | 
/login        |  POST    |  Authenticate user, returns JWT  |  { "username": "johnd",               |                                                       |
              |          |                                       "password": "mypassword" }         |  { "access_token": "...", "token_type": "bearer" }    |
+--------------------------------------------------------------------------------------------------------------------------------------------------------+       
/rooms        |  GET     |  List all available rooms        |  header:Authorization: Bearer <token> |  { "rooms": [ { "name": "Room1", "admin_username":   |     
              |          |                                  |                                       |      "Sohan1" }, ... ] }                              |
+--------------------------------------------------------------------------------------------------------------------------------------------------------+  |
/rooms        |  POST    |  Create room                     | { "name": "Room1" },                  |    { "message": "Room created", ...}                  |
              |          |                                  |   header:Authorization: Bearer <token>|                                                       |
              |          |                                  |                                       |                                                       |
/rooms/       |  DELETE  |  Delete room (admin only)        |  header:Authorization: Bearer <token> |  { "message": "Room deleted" }                        |{room_id}                                                   |                                       |                                                       |
+--------------------------------------------------------------------------------------------------------------------------------------------------------+

### WebSocket Protocol

- **Endpoint:** `ws://localhost:8000/ws/{room_id}?token=<JWT>`
- **Events/messages:**

| **Type**     | **Payload Example**                                                                | **Usage**                    |
| :--          | :--                                                                                | :--                          |
| `drawing`    | `{ type: "draw", from: [x1, y1], to: [x2, y2], color: "#123456", thickness: 3 }` | Broadcasts user’s drawing    |
| `shape`      | `{ type: "shape", shape: "rectangle", ... }`                                       | Broadcasts new shape         |
| `text`       | `{ type: "text", value: "Hello", position: [x, y] }`                               | Places text                  |
| `undo`       | `{ type: "undo" }`                                                                 | Undo last action             |
| `redo`       | `{ type: "redo" }`                                                                 | Redo last undone action      |
| `cursor`     | `{ type: "cursor", position: [x, y], user_id: "xyz" }`                             | Live cursor location update  |
| `snapshot`   | `{ type: "snapshot", state: {...} }`                                               | Snapshot recovery/broadcast  |
| `user_join`  | `{ type: "user_join", username: "johnd" }`                                         | User presence management     |
| `user_leave` | `{ type: "user_leave", username: "johnd" }`                                        | User left notification       | 

**All events are JSON. Users should send/receive events as specified. Unrecognized types are ignored.**

***

### Database Schema

```mermaid
erDiagram
    USER {
      int id PK
      string fullname
      string username
      string hashed_password
    }

    ROOM {
      int id PK
      string name UNIQUE
      string admin_username
    }
    ROOM ||--|{ USER : "admin_username"
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
    ROOM ||--|{ DRAWING_EVENT : "drawing events"
    ROOM_HISTORY {
      int id PK
      int room_id FK
      text history_payload
      datetime timestamp
    }
    ROOM ||--|{ ROOM_HISTORY : "has history"
    SNAPSHOT {
      int id PK
      int room_id FK
      text canvas_state
      datetime timestamp
    }
    ROOM ||--|{ SNAPSHOT : "has snapshots"
```

*(If mermaid is not supported, draw/explain in text: each room has events, history, snapshots; users own rooms.)*

***

Add this to your README.
Next, let me know if you need **more examples or details** for any endpoint, WebSocket event, or schema, or if you also want Postman collections next!

