import { WS_URL, STORAGE_KEYS } from '../constants';

/**
 * WebSocket Service - Handles WebSocket connection management
 */

export const websocketService = {
  /**
   * Create WebSocket connection URL with authentication
   */
  getWebSocketUrl: (roomId) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      throw new Error('No authentication token found');
    }
    return `${WS_URL}/ws/${roomId}?token=${token}`;
  },

  /**
   * Send message through WebSocket
   */
  sendMessage: (ws, message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
      return true;
    }
    console.warn('WebSocket is not open. Message not sent:', message);
    return false;
  },

  /**
   * Parse incoming WebSocket message
   */
  parseMessage: (message) => {
    try {
      return JSON.parse(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      return null;
    }
  }
};
