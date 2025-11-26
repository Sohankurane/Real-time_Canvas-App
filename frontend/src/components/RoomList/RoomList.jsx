import React from 'react';
import { useRoomList } from './RoomList.hook';
import './RoomList.css';

const RoomList = ({ user, onJoinRoom }) => {
  const {
    rooms,
    newRoomName,
    setNewRoomName,
    error,
    isLoading,
    isCreating,
    handleCreateRoom,
    handleJoinRoom,
    handleLogout
  } = useRoomList(user, onJoinRoom);

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h2>Welcome, {user?.username}!</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="create-room-section">
        <h3>Create New Room</h3>
        <form onSubmit={handleCreateRoom} className="create-room-form">
          <input
            type="text"
            placeholder="Enter room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
            disabled={isCreating}
          />
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </form>
        {error && <div className="room-error">{error}</div>}
      </div>

      <div className="rooms-section">
        <h3>Available Rooms</h3>
        {isLoading ? (
          <div className="loading">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="no-rooms">
            No rooms available. Create one to get started!
          </div>
        ) : (
          <ul className="rooms-grid">
            {rooms.map((room) => (
              <li key={room.name} className="room-card">
                <div className="room-info">
                  <h4 className="room-name">{room.name}</h4>
                  <p className="room-admin">
                    Admin: <span>{room.admin_username}</span>
                  </p>
                </div>
                <button
                  className="join-btn"
                  onClick={() => handleJoinRoom(room)}
                >
                  Join Room
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RoomList;
