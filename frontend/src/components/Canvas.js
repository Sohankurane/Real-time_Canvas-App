import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { WebSocketContext } from '../context/WebSocketContext';
import './Canvas.css';

// --- Configuration Constants ---
const COLORS = ['#e53e3e', '#3182ce', '#38a169', '#f6ad55', '#2d3748', '#555'];
const THICKNESS = [2, 4, 6, 8, 12];
const TOOLS = [
  { key: 'brush', label: 'Brush' },
  { key: 'eraser', label: 'Eraser' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'text', label: 'Text' },
  { key: 'undo', label: 'Undo' }
];
const CURSORS = {
  brush: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='8' fill='white' stroke='blue' stroke-width='3'/></svg>\") 16 16, crosshair",
  eraser: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='7' y='10' width='18' height='8' rx='4' fill='pink' stroke='gray' stroke-width='2'/></svg>\") 16 14, pointer",
  rectangle: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='8' y='8' width='16' height='10' stroke='red' fill='white' stroke-width='3'/></svg>\") 16 16, crosshair",
  ellipse: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><ellipse cx='16' cy='16' rx='8' ry='5' stroke='green' fill='white' stroke-width='3'/></svg>\") 16 16, crosshair",
  text: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='4' y='22' font-size='18' font-family='Arial' fill='black'>T</text></svg>\") 6 22, text",
  undo: "crosshair"
};
const CANVAS_W = 1200;
const CANVAS_H = 700;

// --- Utility Function: Debounce ---
function debounce(fn, ms = 12) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

// --- Main Canvas Component ---
const Canvas = ({ user, roomId, adminUsername, onSwitchRoom }) => {
  // --- Local State and Context ---
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: null, y: null });
  const [color, setColor] = useState(COLORS[1]);
  const [thickness, setThickness] = useState(4);
  const [tool, setTool] = useState('brush');
  const [shapes, setShapes] = useState([]);
  const [shapeStart, setShapeStart] = useState(null);
  const [cursors, setCursors] = useState({});
  const [snapshots, setSnapshots] = useState([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const { wsRef, wsStatus, sendMessage, getQueueStatus } = useContext(WebSocketContext);
  const username = user?.username;

  // --- Helper: Clear cursors on room change & send a local event ---
  useEffect(() => {
    setCursors({});
    const canvas = canvasRef.current;
    if (!canvas || !user?.username || !sendMessage) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(rect.width / 2);
    const y = Math.round(rect.height / 2);
    sendMessage({
      type: 'cursor',
      x,
      y,
      userId: user.username,
      name: user.firstName || user.username,
      tool
    });
  }, [roomId, user, sendMessage, tool]);

  // --- Safe wrapper for sending WebSocket messages ---
  const safeSendWS = useCallback((obj) => {
    if (sendMessage) {
      sendMessage(obj);
    } else {
      console.warn('sendMessage not available from context');
    }
  }, [sendMessage]);

  // --- Canvas coordinates relative to element size ---
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H)
    };
  };

  // --- Drawing logic for all supported shapes ---
  const drawStroke = useCallback((stroke) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (['draw', 'brush', 'eraser'].includes(stroke.type)) {
      ctx.beginPath();
      ctx.moveTo(stroke.fromX, stroke.fromY);
      ctx.lineTo(stroke.toX, stroke.toY);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.stroke();
    }
    if (stroke.type === 'rectangle') {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.strokeRect(
        stroke.fromX, stroke.fromY,
        stroke.toX - stroke.fromX, stroke.toY - stroke.fromY
      );
    }
    if (stroke.type === 'ellipse') {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.beginPath();
      ctx.ellipse(
        (stroke.fromX + stroke.toX) / 2,
        (stroke.fromY + stroke.toY) / 2,
        Math.abs((stroke.toX - stroke.fromX) / 2),
        Math.abs((stroke.toY - stroke.fromY) / 2),
        0, 0, 2 * Math.PI
      );
      ctx.stroke();
    }
    if (stroke.type === 'text') {
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.fontSize || 20}px sans-serif`;
      ctx.fillText(stroke.value, stroke.x, stroke.y);
    }
  }, []);

  // --- Snapshot logic for exporting/loading canvas state ---
  const exportCanvasStateJSON = () => JSON.stringify(shapes);
  const loadCanvasFromSnapshot = useCallback((snapshotJSON) => {
    const snap = JSON.parse(snapshotJSON);
    setShapes(snap);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      snap.forEach(drawStroke);
    }
  }, [drawStroke]);

  // --- Handlers for saving and restoring snapshots ---
  const handleSaveSnapshot = () => {
    if (savingSnapshot) return;
    setSavingSnapshot(true);
    safeSendWS({
      type: 'save_snapshot',
      snapshot: exportCanvasStateJSON(),
      username
    });
    setTimeout(() => setSavingSnapshot(false), 1000);
  };

  const handleShowSnapshotHistory = () => {
    safeSendWS({ type: 'get_snapshots' });
    setShowSnapshots(true);
  };

  const handleRestoreSnapshot = (snapshotId) => {
    safeSendWS({
      type: 'restore_snapshot',
      snapshot_id: snapshotId,
      username
    });
  };

  // --- Presence helpers and UI for active users ---
  const getActiveUsers = () => Object.entries(cursors)
    .filter(([id]) => id !== user?.username)
    .map(([id, c]) => ({ id, name: c.name, tool: c.tool, x: c.x, y: c.y }));

  const renderActiveUsersBar = () => (
    <div className="canvas-usersbar">
      <span className="canvas-usersbar-title">Active Participants:</span>
      <span className="canvas-usersbar-user">{user?.firstName || user?.username} (You)</span>
      {getActiveUsers().map(u =>
        <span key={u.id} className="canvas-usersbar-user">
          {u.name} {u.tool ? <span style={{ fontSize: 13, color: '#3182ce' }}>({u.tool})</span> : null}
        </span>
      )}
    </div>
  );

  const renderUserClaims = () => {
    return getActiveUsers().map(u =>
      (u.x != null && u.y != null) ? (
        <div
          key={u.id + "-zone"}
          style={{
            position: 'absolute', left: u.x - 24, top: u.y - 24,
            pointerEvents: 'none', zIndex: 9, width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(226,38,77, 0.16)', border: '2px solid #e53e3e'
          }}
        />
      ) : null
    );
  };

  // --- Conflict detection for real-time coordination ---
  const isConflict = (x, y) => {
    return getActiveUsers().some(u =>
      u.x && u.y && Math.abs(u.x - x) < 45 && Math.abs(u.y - y) < 45
    );
  };

  // --- Effect: Setup websocket for drawing/undo/cursor/messages ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wsRef || !wsRef.current) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';

    // Websocket receive event for this canvas
    const receive = event => {
      const msg = JSON.parse(event.data);
      if (msg.type === "init" && Array.isArray(msg.history)) {
        msg.history.forEach(drawStroke);
      } else if (
        ['draw', 'brush', 'eraser', 'rectangle', 'ellipse', 'text'].includes(msg.type)
      ) {
        drawStroke(msg);
        setShapes(shapes => [...shapes, msg]);
      } else if (msg.type === "undo") {
        setShapes(shapes => {
          const result = shapes.slice(0, -1);
          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          result.forEach(drawStroke);
          return result;
        });
      }
      else if (msg.type === "clear") {
        setShapes([]);
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      }
      else if (msg.type === "cursor" && msg.userId && msg.x != null && msg.y != null) {
        setCursors(prev => ({
          ...prev,
          [msg.userId]: { x: msg.x, y: msg.y, name: msg.name, tool: msg.tool }
        }));
      } 
      // NEW: catch user_left for presence removal
      else if (msg.type === "user_left" && msg.username) {
        setCursors(prevCursors => {
          const newCursors = { ...prevCursors };
          delete newCursors[msg.username];
          return newCursors;
        });
      }
      // SNAPSHOT EVENTS
      if (msg.type === "snapshots_history") {
        setSnapshots(msg.snapshots || []);
      }
      if (msg.type === "snapshot_restored") {
        loadCanvasFromSnapshot(msg.snapshot_data);
        alert(`Snapshot restored by ${msg.restored_by}`);
        setShowSnapshots(false);
      }
    };

    const socket = wsRef.current;
    socket.addEventListener('message', receive);
    return () => socket && socket.removeEventListener('message', receive);
  }, [wsRef, user, drawStroke, loadCanvasFromSnapshot]);

  // --- Undo handler for drawing ---
  const handleUndo = () => {
    setShapes(shapes => {
      const result = shapes.slice(0, -1);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      result.forEach(drawStroke);
      return result;
    });
    safeSendWS({ type: 'undo' });
  };

  // --- Mouse event handlers for drawing and interactions ---
  const start = e => {
    const { x, y } = getCanvasCoords(e);
    if (isConflict(x, y)) {
      alert("Another user is working here! Please choose another area.");
      return;
    }
    if (tool === 'undo') {
      handleUndo();
      setTool('brush');
      return;
    }
    if (tool === 'text') {
      const value = window.prompt("Enter your text:");
      if (value) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = '20px sans-serif';
        ctx.fillText(value, x, y);
        const textStroke = { type: 'text', x, y, value, color, fontSize: 20 };
        setShapes(shapes => [...shapes, textStroke]);
        safeSendWS(textStroke);
      }
      return;
    }
    if (tool === 'rectangle' || tool === 'ellipse') {
      setShapeStart({ x, y });
      setDrawing(true);
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = tool === 'eraser' ? '#f9fafb' : color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setLastPosition({ x, y });
  };

  const sendCursor = useMemo(
    () =>
      debounce(coords => {
        safeSendWS({
          type: 'cursor',
          x: coords.x,
          y: coords.y,
          userId: user.username,
          name: user.firstName || user.username,
          tool
        });
      }, 24),
    [safeSendWS, user, tool]
  );

  const move = e => {
    if (wsRef && wsRef.current && wsRef.current.readyState === 1 && user?.username) {
      const coords = getCanvasCoords(e);
      sendCursor(coords);
    }
    if (!drawing) return;
    if (tool === 'rectangle' || tool === 'ellipse') return;
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    const drawColor = tool === 'eraser' ? '#f9fafb' : color;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = thickness;
    ctx.lineTo(x, y);
    ctx.stroke();
    if (lastPosition.x !== null) {
      const payload = {
        type: tool,
        fromX: lastPosition.x,
        fromY: lastPosition.y,
        toX: x,
        toY: y,
        color: drawColor,
        thickness
      };
      safeSendWS(payload);
      setShapes(shapes => [...shapes, payload]);
    }
    setLastPosition({ x, y });
  };

  const stop = e => {
    setDrawing(false);
    setLastPosition({ x: null, y: null });
    if (tool === 'rectangle' || tool === 'ellipse') {
      if (!shapeStart) return;
      const { x, y } = getCanvasCoords(e);
      const newShape = {
        type: tool,
        fromX: shapeStart.x,
        fromY: shapeStart.y,
        toX: x,
        toY: y,
        color,
        thickness
      };
      setShapes(shapes => [...shapes, newShape]);
      safeSendWS(newShape);
      const ctx = canvasRef.current.getContext('2d');
      if (tool === 'rectangle') {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.strokeRect(shapeStart.x, shapeStart.y, x - shapeStart.x, y - shapeStart.y);
      } else if (tool === 'ellipse') {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.ellipse(
          (shapeStart.x + x) / 2, (shapeStart.y + y) / 2,
          Math.abs((x - shapeStart.x) / 2), Math.abs((y - shapeStart.y) / 2),
          0, 0, 2 * Math.PI
        );
        ctx.stroke();
      }
      setShapeStart(null);
    }
  };

  const renderOtherCursors = () =>
    Object.entries(cursors).map(([id, c]) =>
      id !== user?.username && c.x != null && c.y != null ? (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            pointerEvents: 'none',
            zIndex: 10,
            transform: 'translate(-40%, -70%)'
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #bbb',
              borderRadius: 8,
              padding: '2px 7px',
              fontSize: 13,
              color: '#2d3748',
              boxShadow: '0 0 10px #bbb5'
            }}
          >
            {c.name || 'User'}<span style={{ color: '#3182ce' }}>{c.tool ? ` (${c.tool})` : ''}</span>
          </div>
          <div
            style={{
              width: 14,
              height: 14,
              background: '#3182ce',
              borderRadius: '50%',
              margin: '0 auto'
            }}
          />
        </div>
      ) : null
    );

  const queueStatus = getQueueStatus ? getQueueStatus() : { size: 0, isEmpty: true };
  const statusColor = wsStatus === 'connected' ? 'limegreen' :
                      wsStatus === 'reconnecting' ? 'orange' :
                      wsStatus === 'connecting' ? 'gold' :
                      wsStatus === 'error' ? 'red' : '#888';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {renderActiveUsersBar()}
      <div style={{
        marginBottom: 8,
        fontWeight: 'bold',
        color: statusColor,
        fontSize: 15
      }}>
        Connection: {wsStatus === 'reconnecting' ? 'Reconnecting...' :
                      wsStatus === 'no_auth' ? 'Not Authenticated' :
                      wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
        {queueStatus && queueStatus.size > 0 &&
          <span style={{ marginLeft: 8, fontSize: 13, color: '#666' }}>
            ({queueStatus.size} message{queueStatus.size !== 1 ? 's' : ''} queued)
          </span>
        }
      </div>
      <div className="canvas-title">
        Room: {roomId}
        <span style={{ marginLeft: 18, color: "#aaa", fontSize: 16 }}>
          {adminUsername && `(Admin: ${adminUsername})`}
        </span>
      </div>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <span style={{ fontSize: 14 }}>Tool</span>
        <select
          value={tool}
          style={{ marginLeft: 8, padding: '3px 7px', borderRadius: 8, border: '1px solid #bbb', fontSize: 14 }}
          onChange={e => setTool(e.target.value)}
        >
          {TOOLS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 14, marginLeft: 8 }}>Color</span>
        {COLORS.map(c =>
          <button
            key={c}
            className={'canvas-btn-color' + (color === c ? ' selected' : '')}
            style={{ background: c }}
            onClick={() => { setColor(c); setTool('brush'); }}
          />
        )}
        <span style={{ fontSize: 14, marginLeft: 8 }}>Line</span>
        <select
          value={thickness}
          style={{ marginLeft: 8, padding: '3px 7px', borderRadius: 8, border: '1px solid #bbb', fontSize: 14 }}
          onChange={e => setThickness(Number(e.target.value))}
        >
          {THICKNESS.map(t =>
            <option key={t} value={t}>{t}px</option>
          )}
        </select>
        <button
          className="canvas-clearscreen-btn"
          style={{
            marginLeft: 12,
            padding: '8px 14px',
            borderRadius: 8,
            background: '#e53e3e',
            color: '#fff',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
          onClick={() => {
            safeSendWS({ type: 'clear' });
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            setShapes([]);
          }}
        >Clear Screen</button>
        <button onClick={handleSaveSnapshot} disabled={savingSnapshot} style={{ margin: '0 8px', borderRadius: 6, opacity: savingSnapshot ? 0.6 : 1 }}>
          💾 {savingSnapshot ? "Saving..." : "Save Snapshot"}
        </button>
        <button onClick={handleShowSnapshotHistory} style={{ borderRadius: 6 }}>
          🕒 Show Snapshot History
        </button>
        {onSwitchRoom &&
          <button
            className="canvas-switchroom-btn"
            style={{
              marginLeft: 12,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#3182ce',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={onSwitchRoom}
          >Switch Room</button>
        }
        {user?.username === adminUsername && (
          <button
            className="canvas-deleteroom-btn"
            style={{
              marginLeft: 12,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#b60000',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => {
              safeSendWS({ type: "delete_room" });
            }}
          >Delete Room</button>
        )}
      </div>
      {showSnapshots && (
        <div style={{
          border: '1px solid #3182ce', padding: 14, margin: 10, background: '#f7fafd', borderRadius: 8, width: 375
        }}>
          <h4>Canvas Version History</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {snapshots.map((snap) => (
              <li key={snap.id} style={{ marginBottom: 10 }}>
                <b>{snap.saved_by}</b> at <span style={{ color: "#3182ce" }}>{new Date(snap.created_at).toLocaleString()}</span>
                <button onClick={() => handleRestoreSnapshot(snap.id)} style={{
                  marginLeft: 10, borderRadius: 4, background: "#3182ce", color: "#fff", padding: "4px 12px"
                }}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setShowSnapshots(false)} style={{
            background: "#aaa", color: "#fff", borderRadius: 5, padding: "2px 12px"
          }}>Close</button>
        </div>
      )}
      <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          className="canvas-canvas-area"
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ cursor: CURSORS[tool] || 'crosshair' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
        />
        {renderUserClaims()}
        {renderOtherCursors()}
      </div>
    </div>
  );
};

export default Canvas;
