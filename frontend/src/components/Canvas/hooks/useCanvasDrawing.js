import { useState, useRef, useCallback } from 'react';
import { WS_EVENTS } from '../../../constants';

/**
 * Custom hook for canvas drawing operations
 * Handles mouse events and drawing logic
 */
export const useCanvasDrawing = (canvasRef, tool, color, thickness, sendMessage, roomId) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const historyRef = useRef([]);

  // Get canvas context
  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d');
  }, [canvasRef]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, [canvasRef]);

  // Start drawing
  const startDrawing = useCallback((e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const ctx = getContext();
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [getMousePos, getContext, tool]);

  // Draw on canvas
  const draw = useCallback((e) => {
    if (!isDrawing) return;

    const ctx = getContext();
    if (!ctx) return;

    const pos = getMousePos(e);

    if (tool === 'brush') {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Send to other users
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.BRUSH,
          x: pos.x,
          y: pos.y,
          color,
          thickness
        }));
      }
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = thickness * 2;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

      // Send to other users
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.ERASER,
          x: pos.x,
          y: pos.y,
          thickness: thickness * 2
        }));
      }
    }
  }, [isDrawing, getContext, getMousePos, tool, color, thickness, sendMessage]);

  // Stop drawing
  const stopDrawing = useCallback((e) => {
    if (!isDrawing) return;

    const ctx = getContext();
    if (!ctx) return;

    const pos = getMousePos(e);

    if (tool === 'rectangle') {
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;

      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.strokeRect(startPos.x, startPos.y, width, height);

      // Send to other users
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.RECTANGLE,
          startX: startPos.x,
          startY: startPos.y,
          width,
          height,
          color,
          thickness
        }));
      }
    } else if (tool === 'ellipse') {
      const radiusX = Math.abs(pos.x - startPos.x) / 2;
      const radiusY = Math.abs(pos.y - startPos.y) / 2;
      const centerX = startPos.x + (pos.x - startPos.x) / 2;
      const centerY = startPos.y + (pos.y - startPos.y) / 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Send to other users
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: WS_EVENTS.ELLIPSE,
          centerX,
          centerY,
          radiusX,
          radiusY,
          color,
          thickness
        }));
      }
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${thickness * 6}px Arial`;
        ctx.fillText(text, pos.x, pos.y);

        // Send to other users
        if (sendMessage) {
          sendMessage(JSON.stringify({
            type: WS_EVENTS.TEXT,
            x: pos.x,
            y: pos.y,
            text,
            color,
            fontSize: thickness * 6
          }));
        }
      }
    }

    setIsDrawing(false);
  }, [isDrawing, getContext, getMousePos, tool, color, thickness, startPos, sendMessage]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (sendMessage) {
      sendMessage(JSON.stringify({ type: WS_EVENTS.UNDO }));
    }
  }, [sendMessage]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
  }, [canvasRef, getContext]);

  return {
    startDrawing,
    draw,
    stopDrawing,
    handleUndo,
    clearCanvas
  };
};
