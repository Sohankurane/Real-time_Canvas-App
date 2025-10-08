import React, { useState } from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import Canvas from './components/Canvas';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import RoomList from './components/RoomList';

const App = () => {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  // roomInfo contains {name, admin_username}
  const [roomInfo, setRoomInfo] = useState({ name: '', admin_username: '' });

  // Extracts the first name from the full name for personalization
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.trim().split(' ')[0];
  };

  const handleLogin = (userData) => {
    const firstName = getFirstName(userData.fullName || userData.full_name);
    setUser({ ...userData, firstName });
    setView('room');
  };

  const handleRegister = () => {
    setView('login');
  };

  const renderHeader = () => (
    <header style={{
      padding: '16px 0 0 0',
      textAlign: 'center',
      fontWeight: 700,
      fontSize: '1.8rem',
      color: '#2d3748',
      letterSpacing: '0.5px'
    }}>
      {user && user.firstName
        ? `${user.firstName}'s Real-Time Collaborative Canvas`
        : 'Real-Time Collaborative Canvas'}
    </header>
  );

  // Handler to switch back to room selection
  const handleSwitchRoom = () => setView('room');

  // Handler for room joining (from RoomList)
  const handleJoinRoom = (room) => {
    setRoomInfo({
      name: room.name || room, // fallback for string
      admin_username: room.admin_username || ''
    });
    setView('canvas');
  };

  return (
    <WebSocketProvider roomId={roomInfo.name}>
      <div style={{
        background: '#f6f7fb',
        minHeight: '100vh',
        paddingBottom: 48
      }}>
        {renderHeader()}
        <main style={{
          margin: '32px auto',
          maxWidth: 980,
          minHeight: 500,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 3px 24px #e1e8ed',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {view === 'login' && (
            <LoginForm onSuccess={handleLogin} onSwitch={() => setView('register')} />
          )}
          {view === 'register' && (
            <RegisterForm onSuccess={handleRegister} onSwitch={() => setView('login')} />
          )}
          {view === 'room' && (
            <RoomList
              user={user}
              onJoinRoom={handleJoinRoom} // note updated prop name here
            />
          )}
          {view === 'canvas' && (
            <Canvas
              user={user}
              roomId={roomInfo.name}
              adminUsername={roomInfo.admin_username}
              onSwitchRoom={handleSwitchRoom}
            />
          )}
        </main>
      </div>
    </WebSocketProvider>
  );
};

export default App;
