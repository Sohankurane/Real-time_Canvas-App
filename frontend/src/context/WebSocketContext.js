import React, { createContext, useEffect, useRef, useState, useCallback } from "react";

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

// Provider component for managing websocket lifecycle and message queue,reconnection, authentication, and context distribution.
export const WebSocketProvider = ({ roomId, children }) => {
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [lastMessage, setLastMessage] = useState(null);
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
  const flushMessageQueue = useCallback(() => {
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
  }, []);

  // Send a message; queue if socket is not open
  const sendMessage = useCallback((message) => {
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
  }, []);

  // Connects and manages authentication & reconnection.
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

    // Dynamically determine WebSocket URL based on environment
    const getWebSocketUrl = () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const baseUrl = apiUrl.replace(/^https?:\/\//, '');
      
      return `${wsProtocol}://${baseUrl}/ws/${roomId}?token=${token}`;
    };

    const wsUrl = getWebSocketUrl();
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

      // Centralized message handler - updates lastMessage state
      socket.onmessage = (event) => {
        setLastMessage(event.data);
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`);
        setWsStatus("disconnected");
        wsRef.current = null;

        
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
  }, [roomId, flushMessageQueue]);

  
  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  // Expose message queue size and state
  const getQueueStatus = useCallback(() => ({
    size: messageQueueRef.current.size(),
    isEmpty: messageQueueRef.current.isEmpty()
  }), []);

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
  }, [connect]);

  return (
    <WebSocketContext.Provider
      value={{
        wsRef,
        wsStatus,
        lastMessage,
        sendMessage,
        reconnect,
        getQueueStatus
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
