import React, { useState, useEffect } from "react";
import "./RoomList.css";

function RoomList({ user, onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/rooms", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setRooms(data.rooms);
      })
      .catch(() => setError("Failed to load rooms."));
  }, []);

  const handleCreateRoom = async () => {
    if (!newRoom.trim()) {
      setError("Room name cannot be empty.");
      setSuccess("");
      return;
    }
    setError("");
    try {
      const resp = await fetch("http://localhost:8000/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ room: newRoom.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setRooms([...rooms, { name: newRoom.trim(), admin_username: user.username }]);
        setSuccess("Room created successfully!");
        setNewRoom("");
      } else {
        setError(data.detail || "Failed to create room.");
        setSuccess("");
      }
    } catch {
      setError("Network error while creating room.");
      setSuccess("");
    }
  };

  const handleDeleteRoom = async (roomName) => {
    if (!window.confirm(`Are you sure you want to delete room "${roomName}"?`)) return;
    try {
      const resp = await fetch(`http://localhost:8000/rooms/${roomName}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (resp.ok) {
        setRooms(rooms.filter((room) => room.name !== roomName));
      } else {
        setError("Failed to delete room.");
      }
    } catch {
      setError("Network error while deleting room.");
    }
  };

  const handleJoinRoom = (roomName, admin_username) => {
    if (onJoinRoom) {
      onJoinRoom({ name: roomName, admin_username });
    }
  };

  return (
    <div className="roomlist-container">
      <h2 className="roomlist-title">Available Rooms</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <ul className="roomlist-list" role="list">
        {rooms.map(({ name, admin_username }) => (
          <li
            key={name}
            className={`roomlist-item ${admin_username === user.username ? "admin-room" : ""}`}
            tabIndex={0}
            role="listitem"
          >
            <div>
              <span className="roomlist-room">{name}</span>
              <span className="roomlist-admin-username"> (Admin: {admin_username})</span>
            </div>
            <div>
              <button
                className="roomlist-join-btn"
                onClick={() => handleJoinRoom(name, admin_username)}
              >
                Join
              </button>
              {admin_username === user.username && (
                <button
                  className="roomlist-delete-btn red-delete"
                  onClick={() => handleDeleteRoom(name)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="roomlist-create">
        <input
          className="roomlist-input"
          type="text"
          placeholder="Enter new room name"
          value={newRoom}
          aria-label="New room name"
          onChange={(e) => setNewRoom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
        />
        <button className="roomlist-create-btn" onClick={handleCreateRoom}>
          Create Room
        </button>
      </div>
    </div>
  );
}

export default RoomList;
