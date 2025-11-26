import React, { useState } from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import RoomList from './components/RoomList';
import Canvas from './components/Canvas'; 
import { VIEWS } from './constants';
import './App.css';

const App = () => {
  const [view, setView] = useState(VIEWS.LOGIN);
  const [user, setUser] = useState(null);
  const [roomInfo, setRoomInfo] = useState({ name: '', adminUsername: '' });

  // Extract first name from full name
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.trim().split(' ')[0];
  };

  // Handle successful login
  const handleLogin = (userData) => {
    const firstName = getFirstName(userData.fullName || userData.username);
    setUser({ ...userData, firstName });
    setView(VIEWS.ROOM_LIST);
  };

  // Handle successful registration
  const handleRegister = () => {
    setView(VIEWS.LOGIN);
  };

  // Handle room join
  const handleJoinRoom = (room) => {
    setRoomInfo({
      name: typeof room === 'string' ? room : room.name,
      adminUsername: room.admin_username || room.adminUsername
    });
    setView(VIEWS.CANVAS);
  };

  // Handle switch room (back to room list)
  const handleSwitchRoom = () => {
    setView(VIEWS.ROOM_LIST);
  };

  // Render header based on view
  const renderHeader = () => {
    if (view === VIEWS.LOGIN || view === VIEWS.REGISTER) {
      return null;
    }

    return (
      <header className="app-header">
        {user?.firstName 
          ? `${user.firstName}'s Real-Time Collaborative Canvas` 
          : 'Real-Time Collaborative Canvas'}
      </header>
    );
  };

  return (
    <WebSocketProvider roomId={roomInfo.name}>
      <div className="app-container">
        {renderHeader()}
        
        <main className="app-main">
          {view === VIEWS.LOGIN && (
            <LoginForm
              onSuccess={handleLogin}
              onSwitch={() => setView(VIEWS.REGISTER)}
            />
          )}
          
          {view === VIEWS.REGISTER && (
            <RegisterForm
              onSuccess={handleRegister}
              onSwitch={() => setView(VIEWS.LOGIN)}
            />
          )}
          
          {view === VIEWS.ROOM_LIST && (
            <RoomList
              user={user}
              onJoinRoom={handleJoinRoom}
            />
          )}
          
          {view === VIEWS.CANVAS && (
            <Canvas
              user={user}
              roomId={roomInfo.name}
              adminUsername={roomInfo.adminUsername}
              onSwitchRoom={handleSwitchRoom}
            />
          )}
        </main>
      </div>
    </WebSocketProvider>
  );
};

export default App;
