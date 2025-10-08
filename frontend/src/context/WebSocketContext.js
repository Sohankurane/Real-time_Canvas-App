import React, { createContext, useEffect, useRef, useState } from "react";

export const WebSocketContext = createContext(null);

// Helper to get JWT token from localStorage or cookie (customize as needed)
function getToken() {
  return localStorage.getItem("token"); //store the JWT on login
}

// Usage: <WebSocketProvider roomId={roomId}>...</WebSocketProvider>
export const WebSocketProvider = ({ roomId, children }) => {
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("disconnected");

  useEffect(() => {
    let socket = null;
    let reconnectTimeout = null;

    function connect() {
      if (!roomId) return;
      const token = getToken();
      if (!token) {
        setWsStatus("no_auth");
        return;
      }
      const wsUrl = `ws://localhost:8000/ws/${roomId}?token=${token}`;
      console.log("Connecting to", wsUrl);

      socket = new window.WebSocket(wsUrl);
      wsRef.current = socket;
      setWsStatus("connecting");

      socket.onopen = () => setWsStatus("connected");
      socket.onclose = () => {
        setWsStatus("disconnected");
        reconnectTimeout = setTimeout(connect, 3000); // Retry on disconnect
      };
      socket.onerror = () => {
        setWsStatus("error");
        socket.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
      setWsStatus("disconnected");
    };
    // Only re-run when roomId or token changes
  }, [roomId]);

  return (
    <WebSocketContext.Provider value={{ wsRef, wsStatus }}>
      {children}
    </WebSocketContext.Provider>
  );
};
