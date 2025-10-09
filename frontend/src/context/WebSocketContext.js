import React, { createContext, useEffect, useRef, useState } from "react";

export const WebSocketContext = createContext(null);

// Helper to get JWT token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Message Queue Implementation
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

// Usage: <WebSocketProvider roomId={roomId}>...</WebSocketProvider>
export const WebSocketProvider = ({ roomId, children }) => {
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef(new MessageQueue());
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 2000; // 2 seconds base delay

  // Calculate exponential backoff delay
  const getReconnectDelay = (attempt) => {
    return Math.min(baseReconnectDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  };

  // Flush queued messages when connection is established
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
            // If send fails, stop flushing
            break;
          }
        }
      }
    }
  };

  // Send message with automatic queuing if disconnected
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

  // Main connection function with reconnection logic
  function connect() {
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

    const wsUrl = `ws://localhost:8000/ws/${roomId}?token=${token}`;
    console.log(`Connecting to ${wsUrl} (Attempt ${reconnectAttemptsRef.current + 1})`);

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setWsStatus("connecting");

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setWsStatus("connected");
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
        
        // Flush any queued messages
        setTimeout(() => flushMessageQueue(), 100);
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`);
        setWsStatus("disconnected");
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
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
          messageQueueRef.current.clear(); // Clear queue on permanent failure
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
  }

  // Manual reconnect function (can be called from UI)
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

  // Get queue status
  const getQueueStatus = () => ({
    size: messageQueueRef.current.size(),
    isEmpty: messageQueueRef.current.isEmpty()
  });

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
  }, [roomId]);

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
