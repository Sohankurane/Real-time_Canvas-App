import { API_URL, STORAGE_KEYS } from '../constants';

/**
 * Room Service - Handles all room related API calls
 */

export const roomService = {
  /**
   * Get list of all rooms
   */
  listRooms: async () => {
    try {
      const response = await fetch(`${API_URL}/rooms`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      
      return { success: true, rooms: data.rooms || [] };
    } catch (error) {
      return { success: false, error: error.message, rooms: [] };
    }
  },

  /**
   * Create a new room
   */
  createRoom: async (roomName) => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ room: roomName })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create room');
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a room
   */
  deleteRoom: async (roomName) => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete room');
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
