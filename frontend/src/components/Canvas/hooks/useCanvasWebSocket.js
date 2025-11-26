import { useEffect, useContext, useCallback } from 'react';
import { WebSocketContext } from '../../../context/WebSocketContext';
import { WS_EVENTS } from '../../../constants';

/**
 * Custom hook for handling incoming WebSocket messages for canvas
 */
export const useCanvasWebSocket = (canvasRef, roomId) => {
  const { lastMessage } = useContext(WebSocketContext);

  // Get canvas context
  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d');
  }, [canvasRef]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const msg = JSON.parse(lastMessage);
      const ctx = getContext();
      if (!ctx) return;

      switch (msg.type) {
        case WS_EVENTS.INIT:
          // Handle initial canvas state
          if (msg.history && Array.isArray(msg.history)) {
            msg.history.forEach(event => {
              const evt = JSON.parse(event);
              drawEvent(ctx, evt);
            });
          }
          break;

        case WS_EVENTS.BRUSH:
          ctx.strokeStyle = msg.color;
          ctx.lineWidth = msg.thickness;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineTo(msg.x, msg.y);
          ctx.stroke();
          break;

        case WS_EVENTS.ERASER:
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = msg.thickness;
          ctx.lineCap = 'round';
          ctx.lineTo(msg.x, msg.y);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          break;

        case WS_EVENTS.RECTANGLE:
          ctx.strokeStyle = msg.color;
          ctx.lineWidth = msg.thickness;
          ctx.strokeRect(msg.startX, msg.startY, msg.width, msg.height);
          break;

        case WS_EVENTS.ELLIPSE:
          ctx.strokeStyle = msg.color;
          ctx.lineWidth = msg.thickness;
          ctx.beginPath();
          ctx.ellipse(msg.centerX, msg.centerY, msg.radiusX, msg.radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;

        case WS_EVENTS.TEXT:
          ctx.fillStyle = msg.color;
          ctx.font = `${msg.fontSize}px Arial`;
          ctx.fillText(msg.text, msg.x, msg.y);
          break;

        case WS_EVENTS.CLEAR:
          const canvas = canvasRef.current;
          if (canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          break;

        case WS_EVENTS.SNAPSHOT_RESTORED:
          if (msg.snapshot_data) {
            restoreSnapshot(ctx, msg.snapshot_data);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling canvas WebSocket message:', error);
    }
  }, [lastMessage, getContext, canvasRef]);

  // Helper function to draw an event
  const drawEvent = (ctx, event) => {
    switch (event.type) {
      case WS_EVENTS.BRUSH:
        ctx.strokeStyle = event.color;
        ctx.lineWidth = event.thickness;
        ctx.lineTo(event.x, event.y);
        ctx.stroke();
        break;
      // Add other event types as needed
      default:
        break;
    }
  };

  // Helper function to restore snapshot
  const restoreSnapshot = (ctx, snapshotData) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = snapshotData;
    } catch (error) {
      console.error('Error restoring snapshot:', error);
    }
  };
};
