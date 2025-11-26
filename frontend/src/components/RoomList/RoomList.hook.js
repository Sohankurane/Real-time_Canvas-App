import { useState, useEffect } from 'react';
import { roomService, authService } from '../../service';

/**
 * Custom hook for RoomList component
 * Handles all business logic and state management
 */
export const useRoomList = (user, onJoinRoom) => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch rooms on component mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await roomService.listRooms();
      
      if (result.success) {
        setRooms(result.rooms);
      } else {
        setError(result.error || 'Failed to load rooms');
      }
    } catch (err) {
      setError('Network error while fetching rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const result = await roomService.createRoom(newRoomName);
      
      if (result.success) {
        setNewRoomName('');
        // Refresh room list
        await fetchRooms();
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error while creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (room) => {
    if (onJoinRoom) {
      onJoinRoom(room);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload(); // Reload to reset app state
  };

  return {
    rooms,
    newRoomName,
    setNewRoomName,
    error,
    isLoading,
    isCreating,
    handleCreateRoom,
    handleJoinRoom,
    handleLogout
  };
};
