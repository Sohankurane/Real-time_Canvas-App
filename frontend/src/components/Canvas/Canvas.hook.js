import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { WebSocketContext } from '../../context/WebSocketContext';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { useCanvasWebSocket } from './hooks/useCanvasWebSocket';
import { useCanvasSnapshots } from './hooks/useCanvasSnapshots';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../constants';

/**
 * Main custom hook for Canvas component
 * Orchestrates all canvas-related functionality
 */
export const useCanvas = (user, roomId, adminUsername) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(3);
  
  const { sendMessage } = useContext(WebSocketContext);
  
  // Check if current user is admin
  const isAdmin = user?.username?.toLowerCase() === adminUsername?.toLowerCase();

  // Canvas drawing logic
  const {
    startDrawing,
    draw,
    stopDrawing,
    handleUndo,
    clearCanvas
  } = useCanvasDrawing(canvasRef, tool, color, thickness, sendMessage, roomId);

  // WebSocket message handling
  useCanvasWebSocket(canvasRef, roomId);

  // Snapshot management
  const {
    snapshots,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    loadSnapshots
  } = useCanvasSnapshots(canvasRef, roomId, user?.username);

  // Load snapshots on mount
  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // Set up canvas event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Handle clear board
  const handleClear = useCallback(() => {
    if (!isAdmin) {
      alert('Only the room admin can clear the board');
      return;
    }

    if (window.confirm('Are you sure you want to clear the entire canvas?')) {
      clearCanvas();
      if (sendMessage) {
        sendMessage(JSON.stringify({ type: 'clear' }));
      }
    }
  }, [isAdmin, clearCanvas, sendMessage]);

  // Handle delete room
  const handleDeleteRoom = useCallback(() => {
    if (!isAdmin) {
      alert('Only the room admin can delete the room');
      return;
    }

    if (window.confirm(`Are you sure you want to delete room "${roomId}"? This cannot be undone.`)) {
      if (sendMessage) {
        sendMessage(JSON.stringify({ type: 'delete_room' }));
      }
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }, [isAdmin, roomId, sendMessage]);

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    thickness,
    setThickness,
    snapshots,
    handleClear,
    handleUndo,
    handleSaveSnapshot,
    handleRestoreSnapshot,
    handleDeleteRoom,
    isAdmin
  };
};
