import React, { createContext, useEffect, useRef, useState, useCallback } from "react";

// Get WebSocket URL from environment variable (falls back to localhost if not set)
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";

// Context for sharing websocket state and actions across the app
export const WebSocketContext = createContext(null);

// Helper to get JWT token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// In-memory message queue for reliable message delivery (disconnect tolerance)
class MessageQueue {
  constructor() {
    this.queue = [];
    this.maxQueueSize = 100;
  }

  enqueue(message) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message');
      this.queue.shift();
    }
    this.queue.push({
      message,
      timestamp: Date.now()
    });
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }

  getAllMessages() {
    return [...this.queue];
  }
}

// Provider component for managing websocket lifecycle and message queue,
// reconnection, authentication, and context distribution.
export const WebSocketProvider = ({ roomId, children }) => {
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef(new MessageQueue());
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 2000; // 2 seconds base delay

  // Calculate exponential backoff delay for reconnect attempts
  const getReconnectDelay = (attempt) => (
    Math.min(baseReconnectDelay * Math.pow(2, attempt), 30000)
  ); // max 30 seconds

  // Try to send all queued messages on connection (flush)
  const flushMessageQueue = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const queueSize = messageQueueRef.current.size();
      if (queueSize > 0) {
        console.log(`Flushing ${queueSize} queued messages`);
        while (!messageQueueRef.current.isEmpty()) {
          const item = messageQueueRef.current.dequeue();
          try {
            wsRef.current.send(item.message);
          } catch (error) {
            console.error('Failed to send queued message:', error);
            break;
          }
        }
      }
    }
  };

  // Send a message; queue if socket is not open
  const sendMessage = (message) => {
    const msgString = typeof message === 'string' ? message : JSON.stringify(message);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(msgString);
      } catch (error) {
        console.error('Failed to send message, queuing:', error);
        messageQueueRef.current.enqueue(msgString);
      }
    } else {
      console.log('WebSocket not ready, queuing message');
      messageQueueRef.current.enqueue(msgString);
    }
  };

  // Connects and manages authentication & reconnection.
  // Called automatically and upon reconnect.
  const connect = useCallback(() => {
    if (!roomId) {
      console.warn('No roomId provided');
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('No authentication token found');
      setWsStatus("no_auth");
      return;
    }

    // Use environment variable for WebSocket URL
    const wsUrl = `${WS_URL}/ws/${roomId}?token=${token}`;
    console.log(`Connecting to ${wsUrl} (Attempt ${reconnectAttemptsRef.current + 1})`);

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setWsStatus("connecting");

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setWsStatus("connected");
        reconnectAttemptsRef.current = 0; // Reset on success
        setTimeout(() => flushMessageQueue(), 100);
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`);
        setWsStatus("disconnected");
        wsRef.current = null;

        // Exponential backoff & auto-retry with cap on attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setWsStatus("reconnecting");
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached. Please refresh the page.');
          setWsStatus("error");
          messageQueueRef.current.clear();
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error occurred:', error);
        setWsStatus("error");
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsStatus("error");
    }
  }, [roomId]); // Only change on roomId

  // Manual reconnect for use from UI
  const reconnect = () => {
    console.log('Manual reconnection requested');
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  };

  // Expose message queue size and state
  const getQueueStatus = () => ({
    size: messageQueueRef.current.size(),
    isEmpty: messageQueueRef.current.isEmpty()
  });

  // Initiate websocket and cleanup on roomId change or unmount
  useEffect(() => {
    connect();
    return () => {
      console.log('Cleaning up WebSocket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setWsStatus("disconnected");
    };
    // Only re-run when connect() reference changes
  }, [connect]);

  // Distribute websocket context:
  // - wsRef: current socket ref
  // - wsStatus: connection status string
  // - sendMessage: send (with queue fallback)
  // - reconnect: manual reconnect callback
  // - getQueueStatus: exposes queue state for UI
  return (
    <WebSocketContext.Provider
      value={{
        wsRef,
        wsStatus,
        sendMessage,
        reconnect,
        getQueueStatus
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
